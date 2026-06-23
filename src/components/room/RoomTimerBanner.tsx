'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Radio, User2, BookOpen, Coffee, BedDouble } from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { usePomodoro, SESSION_COLORS } from '@/hooks/usePomodoro';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function SessionIcon({ type, size = 14 }: { type: string; size?: number }) {
  if (type === 'focus')      return <BookOpen size={size} />;
  if (type === 'shortBreak') return <Coffee size={size} />;
  return <BedDouble size={size} />;
}

const SESSION_LABELS: Record<string, string> = {
  focus:      'تركيز',
  shortBreak: 'راحة قصيرة',
  longBreak:  'راحة طويلة',
  idle:       'في الانتظار',
};

// ─── Synced Compact Timer (private room, sync ON) ─────────────────────────────────

function SyncedBigTimer() {
  const { myId, leaderId, syncedTimerState } = useRoomStore();
  const myTimer = useTimerStore();
  const { start, pause, resume, reset } = usePomodoro();

  const isLeader = myId === leaderId;

  const [followerDisplay, setFollowerDisplay] = useState<number>(
    syncedTimerState?.remainingSeconds ?? myTimer.remainingSeconds
  );
  const lastSyncRef = useRef(syncedTimerState);

  useEffect(() => {
    if (isLeader || !syncedTimerState) return;
    const elapsed = Math.floor((Date.now() - (syncedTimerState.timestamp ?? Date.now())) / 1000);
    const adjusted = Math.max(0, syncedTimerState.remainingSeconds - elapsed);
    setFollowerDisplay(adjusted);
    lastSyncRef.current = syncedTimerState;
    if (syncedTimerState.timerStatus !== 'running') return;
    const interval = setInterval(() => {
      setFollowerDisplay((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [syncedTimerState, isLeader]);

  const remaining = isLeader ? myTimer.remainingSeconds : followerDisplay;
  const total     = isLeader ? myTimer.totalSeconds : (syncedTimerState?.totalSeconds ?? myTimer.totalSeconds);
  const sessionType = isLeader ? myTimer.sessionType : (syncedTimerState?.sessionType ?? 'focus');
  const timerStatus = isLeader ? myTimer.status : (syncedTimerState?.timerStatus ?? 'idle');

  const color    = SESSION_COLORS[sessionType] ?? 'var(--primary)';
  const progress = total > 0 ? remaining / total : 1;

  const isRunning = timerStatus === 'running';
  const isPaused  = timerStatus === 'paused';

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 px-2 md:px-4">
      {/* Left side: Status and Type */}
      <div className="flex items-center justify-center md:justify-start gap-2 w-full md:w-auto">
        <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-black/30 border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
          <Radio size={12} className="text-red-500 animate-pulse" />
          <span className="text-red-400">مزامنة مباشرة</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-white/5 border border-white/10" style={{ color }}>
          <SessionIcon type={sessionType} size={14} />
          <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest">{SESSION_LABELS[sessionType]}</span>
        </div>
      </div>

      {/* Center: The Timer and Progress Bar */}
      <div className="flex-1 w-full max-w-md flex flex-col items-center gap-1">
        <span className="text-3xl md:text-4xl font-black font-mono tabular-nums tracking-tighter leading-none"
          style={{ color: timerStatus === 'idle' ? 'var(--foreground)' : color }}>
          {formatTime(remaining)}
        </span>
        <div className="w-full max-w-[200px] md:max-w-[300px] h-1 md:h-1.5 bg-black/20 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Right side: Controls (if leader) or status (if follower) */}
      <div className="flex items-center justify-center md:justify-end gap-3 w-full md:w-auto min-w-[120px]">
        {isLeader ? (
          <div className="flex items-center gap-2">
            <button onClick={reset}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title="إعادة تعيين">
              <RotateCcw size={14} />
            </button>
            {timerStatus === 'idle' && (
              <button onClick={start}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black shadow-lg transition-all hover:scale-110 active:scale-95"
                style={{ background: color, color: '#fff', boxShadow: `0 4px 20px ${color}40` }}>
                <Play size={18} fill="white" className="ml-1" />
              </button>
            )}
            {timerStatus === 'running' && (
              <button onClick={pause}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black shadow-lg transition-all hover:scale-110 active:scale-95"
                style={{ background: color, color: '#fff', boxShadow: `0 4px 20px ${color}40` }}>
                <Pause size={18} fill="white" />
              </button>
            )}
            {timerStatus === 'paused' && (
              <button onClick={resume}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black shadow-lg transition-all hover:scale-110 active:scale-95"
                style={{ background: color, color: '#fff', boxShadow: `0 4px 20px ${color}40` }}>
                <Play size={18} fill="white" className="ml-1" />
              </button>
            )}
          </div>
        ) : (
          <p className="text-[10px] md:text-xs text-muted-foreground font-medium text-center">
            {isRunning ? '⏱ يتم التزامن مع الأدمن' : isPaused ? '⏸ الأدمن أوقف مؤقتاً' : '⏹ في انتظار الأدمن'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Banner Export ───────────────────────────────────────────────────────

export function RoomTimerBanner() {
  const { roomType, timerSync } = useRoomStore();

  const showBigSync = roomType === 'private' && timerSync;

  if (!showBigSync) return null;

  return (
    <div
      className="w-full rounded-2xl md:rounded-3xl border border-white/8 bg-card/30 backdrop-blur-xl shadow-xl transition-all duration-500 p-3 md:p-5 flex justify-center"
      style={{ boxShadow: '0 0 60px rgba(var(--primary-rgb),0.08)' }}
    >
      <SyncedBigTimer />
    </div>
  );
}
