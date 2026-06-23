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

// ─── Small arc ring ──────────────────────────────────────────────────────────

function MiniRing({
  progress, color, size = 52, stroke = 4, children,
}: { progress: number; color: string; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.4s ease' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

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

// ─── Per-person mini timer card ───────────────────────────────────────────────

interface PersonTimerData {
  id: string;
  name: string;
  timerStatus: 'running' | 'paused' | 'idle';
  sessionType: string;
  remainingSeconds: number;
  totalSeconds: number;
  timerLastUpdated?: number;
  isMe?: boolean;
}

function PersonTimerCard({ person }: { person: PersonTimerData }) {
  const color = SESSION_COLORS[person.sessionType as keyof typeof SESSION_COLORS] ?? 'var(--primary)';

  // Local ticking countdown — starts from remainingSeconds adjusted for elapsed time
  const [display, setDisplay] = useState(() => {
    if (person.timerStatus === 'running' && person.timerLastUpdated) {
      const elapsed = Math.floor((Date.now() - person.timerLastUpdated) / 1000);
      return Math.max(0, person.remainingSeconds - elapsed);
    }
    return person.remainingSeconds;
  });

  useEffect(() => {
    let initial = person.remainingSeconds;
    if (person.timerStatus === 'running' && person.timerLastUpdated) {
      const elapsed = Math.floor((Date.now() - person.timerLastUpdated) / 1000);
      initial = Math.max(0, initial - elapsed);
    }
    setDisplay(initial);

    if (person.timerStatus !== 'running') return;
    const interval = setInterval(() => {
      setDisplay((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [person.timerStatus, person.remainingSeconds, person.timerLastUpdated]);

  const total = person.totalSeconds > 0 ? person.totalSeconds : person.remainingSeconds;
  const progress = total > 0 ? display / total : 1;

  const isRunning = person.timerStatus === 'running';
  const isPaused  = person.timerStatus === 'paused';
  const isIdle    = person.timerStatus === 'idle';

  return (
    <div
      className={`
        flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-300 shrink-0 w-[110px]
        ${person.isMe
          ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
          : 'bg-card/40 backdrop-blur-md border-white/8 hover:border-white/15'}
      `}
      style={isRunning ? { boxShadow: `0 0 20px ${color}20` } : undefined}
    >
      <MiniRing progress={progress} color={isIdle ? 'var(--border)' : color} size={52} stroke={4}>
        <div
          className="text-[9px] font-black font-mono"
          style={{ color: isIdle ? 'var(--muted-foreground)' : color }}
        >
          {isIdle ? '—' : formatTime(display)}
        </div>
      </MiniRing>

      {/* Name */}
      <p className="text-[11px] font-bold text-foreground truncate w-full text-center leading-tight">
        {person.name}
        {person.isMe && <span className="text-muted-foreground font-normal"> (أنت)</span>}
      </p>

      {/* Status chip */}
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide w-full justify-center ${
          isIdle    ? 'bg-muted/40 text-muted-foreground' :
          isPaused  ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-transparent'
        }`}
        style={isRunning ? { color, background: `${color}18` } : undefined}
      >
        {isRunning && <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: color }} />}
        {isPaused  && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />}
        <SessionIcon type={isIdle ? 'idle' : person.sessionType} size={9} />
        <span className="truncate">{SESSION_LABELS[isIdle ? 'idle' : person.sessionType] ?? person.sessionType}</span>
      </div>
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

// ─── Individual timers row (sync OFF or random rooms) ─────────────────────────

function IndividualTimersRow() {
  const { peers, myId, myName } = useRoomStore();
  const myTimer = useTimerStore();

  const meData: PersonTimerData = {
    id:               myId ?? 'me',
    name:             myName || 'أنت',
    timerStatus:      myTimer.status as 'running' | 'paused' | 'idle',
    sessionType:      myTimer.sessionType,
    remainingSeconds: myTimer.remainingSeconds,
    totalSeconds:     myTimer.totalSeconds,
    timerLastUpdated: myTimer.lastUpdatedAt,
    isMe:             true,
  };

  const peerList: PersonTimerData[] = Object.values(peers).map((p) => ({
    id:               p.id,
    name:             p.name,
    timerStatus:      (p.timerStatus ?? 'idle') as 'running' | 'paused' | 'idle',
    sessionType:      p.status === 'idle' ? 'idle' : (p.status ?? 'idle'),
    remainingSeconds: p.remainingSeconds ?? 0,
    totalSeconds:     0, // peers don't send totalSeconds via presence — use remainingSeconds as ref
    timerLastUpdated: p.timerLastUpdated,
  }));

  const allPeople = [meData, ...peerList];

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar w-full px-1"
      style={{ scrollbarWidth: 'thin' }}>
      {allPeople.map((person) => (
        <PersonTimerCard key={person.id} person={person} />
      ))}
    </div>
  );
}

// ─── Main Banner Export ───────────────────────────────────────────────────────

export function RoomTimerBanner() {
  const { roomType, timerSync } = useRoomStore();

  const showBigSync = roomType === 'private' && timerSync;

  return (
    <div
      className={`
        w-full rounded-2xl md:rounded-3xl border border-white/8 bg-card/30 backdrop-blur-xl
        shadow-xl transition-all duration-500
        ${showBigSync ? 'p-3 md:p-5 flex justify-center' : 'px-3 py-2 md:px-4 md:py-3'}
      `}
      style={showBigSync ? { boxShadow: '0 0 60px rgba(var(--primary-rgb),0.08)' } : undefined}
    >
      {showBigSync ? (
        <SyncedBigTimer />
      ) : (
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
            <User2 size={10} />
            {roomType === 'private' ? 'أوقات الأعضاء' : 'أوقات المجموعة'}
          </div>
          <IndividualTimersRow />
        </div>
      )}
    </div>
  );
}
