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

// ─── Big arc ring (sync mode) ────────────────────────────────────────────────

function BigRing({
  progress, color, size = 180, stroke = 10, children,
}: { progress: number; color: string; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} opacity={0.3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Synced Big Timer (private room, sync ON) ─────────────────────────────────

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
    <div className="flex flex-col items-center gap-3">
      {/* LIVE badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-black uppercase tracking-widest">
        <Radio size={10} className="text-red-500 animate-pulse" />
        <span className="text-red-400">مزامنة مباشرة</span>
        {!isLeader && <span className="text-muted-foreground">· {SESSION_LABELS[sessionType]}</span>}
      </div>

      {/* Big ring — smaller on mobile */}
      <div className="block md:hidden">
        <BigRing progress={progress} color={color} size={140} stroke={8}>
          <div className="flex flex-col items-center gap-1 select-none">
            <span className="text-3xl font-black font-mono tabular-nums tracking-tighter"
              style={{ color: timerStatus === 'idle' ? 'var(--foreground)' : color }}>
              {formatTime(remaining)}
            </span>
            <div className="flex items-center gap-1" style={{ color }}>
              <SessionIcon type={sessionType} size={10} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{SESSION_LABELS[sessionType]}</span>
            </div>
          </div>
        </BigRing>
      </div>
      <div className="hidden md:block">
        <BigRing progress={progress} color={color} size={200} stroke={12}>
          <div className="flex flex-col items-center gap-1 select-none">
            <span className="text-5xl font-black font-mono tabular-nums tracking-tighter"
              style={{ color: timerStatus === 'idle' ? 'var(--foreground)' : color }}>
              {formatTime(remaining)}
            </span>
            <div className="flex items-center gap-1.5" style={{ color }}>
              <SessionIcon type={sessionType} size={13} />
              <span className="text-xs font-bold uppercase tracking-widest">{SESSION_LABELS[sessionType]}</span>
            </div>
          </div>
        </BigRing>
      </div>

      {/* Leader controls */}
      {isLeader && (
        <div className="flex items-center gap-3">
          <button onClick={reset}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="إعادة تعيين">
            <RotateCcw size={14} />
          </button>
          {timerStatus === 'idle' && (
            <button onClick={start}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black shadow-2xl transition-all hover:scale-110 active:scale-95"
              style={{ background: color, color: '#fff', boxShadow: `0 8px 32px ${color}50` }}>
              <Play size={20} fill="white" />
            </button>
          )}
          {timerStatus === 'running' && (
            <button onClick={pause}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black shadow-2xl transition-all hover:scale-110 active:scale-95"
              style={{ background: color, color: '#fff', boxShadow: `0 8px 32px ${color}50` }}>
              <Pause size={20} fill="white" />
            </button>
          )}
          {timerStatus === 'paused' && (
            <button onClick={resume}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black shadow-2xl transition-all hover:scale-110 active:scale-95"
              style={{ background: color, color: '#fff', boxShadow: `0 8px 32px ${color}50` }}>
              <Play size={20} fill="white" />
            </button>
          )}
        </div>
      )}

      {!isLeader && (
        <p className="text-[11px] text-muted-foreground font-medium">
          {isRunning ? '⏱ يتم التزامن مع الأدمن' : isPaused ? '⏸ الأدمن أوقف مؤقتًا' : '⏹ في انتظار الأدمن'}
        </p>
      )}
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
