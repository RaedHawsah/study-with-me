/**
 * Ambient Sound Engine — synthesises all ambient sounds via Web Audio API.
 * No external audio files required. Browser-only: check isSupported() before use.
 *
 * Architecture:
 *   Each sound = noise buffer source → filter chain → gain node → master gain → destination
 *   Noise buffers are generated once and cached to avoid repetitive allocation.
 */

import type { SoundId } from '@/store/usePreferencesStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Channel {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  /** Non-source nodes that must be stopped/disconnected on cleanup */
  extras: AudioNode[];
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channels = new Map<SoundId, Channel>();
  /** Cached noise buffers keyed by type+duration */
  private bufferCache = new Map<string, AudioBuffer>();

  // ── Context management ─────────────────────────────────────────────────────

  private async getCtx(): Promise<AudioContext> {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      this.ctx = new Ctor() as AudioContext;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  // ── Noise buffer generators ────────────────────────────────────────────────

  private whiteNoise(ctx: AudioContext, secs: number): AudioBuffer {
    const key = `white-${secs}`;
    if (this.bufferCache.has(key)) return this.bufferCache.get(key)!;
    const len = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.bufferCache.set(key, buf);
    return buf;
  }

  private brownNoise(ctx: AudioContext, secs: number): AudioBuffer {
    const key = `brown-${secs}`;
    if (this.bufferCache.has(key)) return this.bufferCache.get(key)!;
    const len = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
    this.bufferCache.set(key, buf);
    return buf;
  }

  // ── Sound-specific signal chains ───────────────────────────────────────────

  private buildWind(ctx: AudioContext, out: GainNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise(ctx, 4);
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 0.4;

    // LFO → filter freq for the "whoosh" motion
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 280;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    lfo.start();

    src.connect(bp);
    bp.connect(out);
    src.start();
    return { src, extras: [bp, lfo, lfoGain] as AudioNode[] };
  }

  private buildRain(ctx: AudioContext, out: GainNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise(ctx, 2);
    src.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1100;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 10000;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(out);
    src.start();
    return { src, extras: [hp, lp] as AudioNode[] };
  }

  private buildFire(ctx: AudioContext, out: GainNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.brownNoise(ctx, 4);
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    lp.Q.value = 0.5;

    // Sawtooth LFO on gain → crackling flicker
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.07;
    lfo.connect(lfoGain);
    lfoGain.connect(out.gain);
    lfo.start();

    src.connect(lp);
    lp.connect(out);
    src.start();
    return { src, extras: [lp, lfo, lfoGain] as AudioNode[] };
  }

  private buildCoffee(ctx: AudioContext, out: GainNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise(ctx, 4);
    src.loop = true;

    // Two bandpass layers → crowd murmur signature
    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = 280;
    bp1.Q.value = 0.9;

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = 900;
    bp2.Q.value = 1.4;

    const merge = ctx.createGain();
    merge.gain.value = 0.45;

    src.connect(bp1);
    src.connect(bp2);
    bp1.connect(merge);
    bp2.connect(merge);
    merge.connect(out);
    src.start();
    return { src, extras: [bp1, bp2, merge] as AudioNode[] };
  }

  private buildLofi(ctx: AudioContext, out: GainNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.brownNoise(ctx, 3);
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2800;

    // Warm bass suggestion — A1
    const bass = ctx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.value = 55;
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.045;
    bass.connect(bassGain);
    bassGain.connect(out);
    bass.start();

    // Soft chord hint — A3
    const chord = ctx.createOscillator();
    chord.type = 'sine';
    chord.frequency.value = 220;
    const chordGain = ctx.createGain();
    chordGain.gain.value = 0.018;
    chord.connect(chordGain);
    chordGain.connect(out);
    chord.start();

    src.connect(lp);
    lp.connect(out);
    src.start();
    return {
      src,
      extras: [lp, bass, bassGain, chord, chordGain] as AudioNode[],
    };
  }

  private buildNature(ctx: AudioContext, out: GainNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise(ctx, 3);
    src.loop = true;

    // Background rustling — band between 2–8 kHz
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 8000;

    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.28;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(rustleGain);
    rustleGain.connect(out);
    src.start();

    const extras: AudioNode[] = [hp, lp, rustleGain];

    // Cricket oscillators — three pitches, amplitude-modulated
    const crickets: [number, number][] = [[3800, 8], [4300, 11], [5100, 9]];
    crickets.forEach(([freq, modFreq]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const ampMod = ctx.createOscillator();
      ampMod.type = 'square';
      ampMod.frequency.value = modFreq;

      const modGain = ctx.createGain();
      modGain.gain.value = 0.013;

      const oscGain = ctx.createGain();
      oscGain.gain.value = 0;

      ampMod.connect(modGain);
      modGain.connect(oscGain.gain);
      osc.connect(oscGain);
      oscGain.connect(out);

      osc.start();
      ampMod.start();
      extras.push(osc, ampMod, modGain, oscGain);
    });

    return { src, extras };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async play(id: SoundId, volume: number): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const ctx = await this.getCtx();

      // Already playing — just update volume
      if (this.channels.has(id)) {
        const ch = this.channels.get(id)!;
        ch.gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
        return;
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.connect(this.masterGain!);

      let built: { src: AudioBufferSourceNode; extras: AudioNode[] };
      switch (id) {
        case 'wind':   built = this.buildWind(ctx, gainNode);   break;
        case 'rain':   built = this.buildRain(ctx, gainNode);   break;
        case 'fire':   built = this.buildFire(ctx, gainNode);   break;
        case 'coffee': built = this.buildCoffee(ctx, gainNode); break;
        case 'lofi':   built = this.buildLofi(ctx, gainNode);   break;
        case 'nature': built = this.buildNature(ctx, gainNode); break;
        default: return;
      }

      // Fade in
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.6);
      this.channels.set(id, {
        source: built.src,
        gainNode,
        extras: built.extras,
      });
    } catch (err) {
      console.warn(`[AudioEngine] play(${id}) failed:`, err);
    }
  }

  async stop(id: SoundId): Promise<void> {
    if (!this.ctx || !this.channels.has(id)) return;
    const ch = this.channels.get(id)!;
    const ctx = this.ctx;

    ch.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => {
      try { ch.source.stop(); } catch { /* already stopped */ }
      try { ch.gainNode.disconnect(); } catch { /* already disconnected */ }
      ch.extras.forEach((n) => {
        try { (n as OscillatorNode).stop?.(); } catch { /* ok */ }
        try { n.disconnect?.(); } catch { /* ok */ }
      });
      this.channels.delete(id);
    }, 600);
  }

  setVolume(id: SoundId, volume: number): void {
    if (!this.ctx || !this.channels.has(id)) return;
    const ch = this.channels.get(id)!;
    ch.gainNode.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  stopAll(): void {
    for (const id of Array.from(this.channels.keys())) {
      this.stop(id);
    }
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('AudioContext' in window || 'webkitAudioContext' in window)
    );
  }
}
