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
