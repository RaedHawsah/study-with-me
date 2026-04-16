/**
 * Ambient Sound Engine — handles playback of custom audio files.
 * Singleton pattern ensures a single AudioContext is shared across the app,
 * preventing multiple engines from playing sounds simultaneously and enabling
 * shared state between different components (e.g., Mixer and Dock).
 *
 * v2 — fixes:
 *  - Lazy ArrayBuffer cache: preload() no longer creates AudioContext (avoids
 *    autoplay-policy DOMException before user gesture).
 *  - Smart path resolution: built-ins get .mp3 extension first.
 *  - Race-condition guard: pendingOps set prevents double-play/stop overlap.
 *  - Public resumeContext() for visibility-change recovery.
 *  - Public isPlaying(id) for UI sync.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Channel {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class AmbientSoundEngine {
  private static instance: AmbientSoundEngine | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channels = new Map<string, Channel>();

  // Buffer cache: decoded AudioBuffer (ready to play)
  private bufferCache = new Map<string, AudioBuffer>();
  // Raw cache: fetched ArrayBuffer (before decode — avoids re-fetching without creating AudioContext)
  private rawCache = new Map<string, ArrayBuffer>();

  // Anti-race locks: tracks in-flight play/stop operations
  private pendingPlay = new Map<string, Promise<void>>();
  private stopRequests = new Set<string>();

  private constructor() {}

  public static getInstance(): AmbientSoundEngine {
    if (!AmbientSoundEngine.instance) {
      AmbientSoundEngine.instance = new AmbientSoundEngine();
    }
    return AmbientSoundEngine.instance;
  }

  // ── Context management ─────────────────────────────────────────────────────

  private async getCtx(): Promise<AudioContext> {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
      this.ctx = new Ctor() as AudioContext;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    return this.ctx;
  }

  /**
   * Call this when the page regains visibility (tab switch back).
   * Resumes a suspended AudioContext without replaying sounds.
   */
  public async resumeContext(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
  }

  // ── Path Resolution ────────────────────────────────────────────────────────

  /**
   * Returns ordered list of URLs to try for a given sound ID.
   * - Built-in IDs (no extension) → try /audio/custom/id.mp3 first, then /audio/id.mp3
   * - Custom filenames (with extension) → try /audio/custom/filename first
   */
  private getPathCandidates(id: string): string[] {
    const hasExtension = /\.[a-z0-9]+$/i.test(id);
    if (hasExtension) {
      // Custom uploaded file
      return [
        `/audio/custom/${id}`,
        `/audio/${id}`,
      ];
    }
    // Built-in sound — try mp3, wav, ogg
    return [
      `/audio/custom/${id}.mp3`,
      `/audio/${id}.mp3`,
      `/audio/custom/${id}.wav`,
      `/audio/${id}.wav`,
      `/audio/custom/${id}.ogg`,
      `/audio/${id}.ogg`,
    ];
  }

  // ── Fetch Helper ───────────────────────────────────────────────────────────

  private async fetchAudioBuffer(id: string): Promise<ArrayBuffer | null> {
    // Use raw cache first (avoids re-fetch)
    if (this.rawCache.has(id)) {
      return this.rawCache.get(id)!.slice(0); // slice to get a fresh copy for decoding
    }

    const candidates = this.getPathCandidates(id);
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        this.rawCache.set(id, buf);
        return buf.slice(0);
      } catch { /* try next */ }
    }
    return null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Pre-fetches the raw audio data in the background WITHOUT creating
   * an AudioContext (safe to call before any user gesture).
   */
  async preload(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.rawCache.has(id) || this.bufferCache.has(id)) return;

    // Fire-and-forget background fetch
    this.fetchAudioBuffer(id).catch(() => {/* silent */});
  }

  async play(id: string, volume: number): Promise<void> {
    if (typeof window === 'undefined') return;

    this.stopRequests.delete(id);

    // If already playing, just set volume
    if (this.channels.has(id)) {
      this.setVolume(id, volume);
      return;
    }

    // If a play is already in flight, wait for it
    if (this.pendingPlay.has(id)) {
      await this.pendingPlay.get(id);
      if (this.channels.has(id)) {
        this.setVolume(id, volume);
      }
      return;
    }

    const playPromise = (async () => {
      try {
        // Get or decode AudioBuffer
        let audioBuffer = this.bufferCache.get(id);

        if (!audioBuffer) {
          const rawBuf = await this.fetchAudioBuffer(id);
          if (!rawBuf) {
            throw new Error(`[AudioEngine] No audio file found for "${id}"`);
          }

          // Now we need AudioContext to decode — this is fine because play() is
          // always called after a user gesture (click/tap on a SoundCard).
          const ctx = await this.getCtx();
          audioBuffer = await ctx.decodeAudioData(rawBuf);
          this.bufferCache.set(id, audioBuffer);
        }

        // Check if stop was requested while we were loading
        if (this.stopRequests.has(id)) {
          this.stopRequests.delete(id);
          return;
        }

        const ctx = await this.getCtx();

        // Safety: don't double-play
        if (this.channels.has(id)) {
          this.setVolume(id, volume);
          return;
        }

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.connect(this.masterGain!);

        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        src.loop = true;
        src.connect(gainNode);
        src.start();

        // Smooth fade-in
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.5);

        this.channels.set(id, { source: src, gainNode });
      } catch (err) {
        console.warn(`[AudioEngine] play(${id}) failed:`, err);
        throw err;
      }
    })();

    this.pendingPlay.set(id, playPromise);
    try {
      await playPromise;
    } finally {
      this.pendingPlay.delete(id);
    }
  }

  async stop(id: string): Promise<void> {
    this.stopRequests.add(id);

    // Wait for in-flight play to settle before stopping
    if (this.pendingPlay.has(id)) {
      try { await this.pendingPlay.get(id); } catch { /* ignore */ }
    }

    if (!this.ctx || !this.channels.has(id)) {
      this.stopRequests.delete(id);
      return;
    }

    const ch = this.channels.get(id)!;
    const ctx = this.ctx;

    // Fade out over ~400ms
    ch.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.1);

    // Remove from channels immediately so isPlaying() returns false
    this.channels.delete(id);

    // Cleanup audio nodes after fade completes
    setTimeout(() => {
      try { ch.source.stop(); } catch { /* ok */ }
      try { ch.gainNode.disconnect(); } catch { /* ok */ }
    }, 500);

    this.stopRequests.delete(id);
  }

  setVolume(id: string, volume: number): void {
    if (!this.ctx || !this.channels.has(id)) return;
    const ch = this.channels.get(id)!;
    ch.gainNode.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  stopAll(): void {
    for (const id of Array.from(this.channels.keys())) {
      this.stop(id);
    }
    this.stopRequests.clear();
  }

  /** True only if a channel is actually active in the AudioContext. */
  isPlaying(id: string): boolean {
    return this.channels.has(id);
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('AudioContext' in window || 'webkitAudioContext' in window)
    );
  }
}
