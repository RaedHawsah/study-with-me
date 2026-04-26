'use client';

import { useGamificationStore, getLevelFromXp } from '@/store/useGamificationStore';
import { Flame, Zap, Trophy } from 'lucide-react';

export function StreakBadge() {
  const { totalXp, currentStreak } = useGamificationStore();
  const level = getLevelFromXp(totalXp);

  return (
    <div className="flex items-center gap-3 bg-card/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl hover:scale-[1.02] transition-all cursor-default group">
      {/* Streak Part */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
        <div className="relative">
          <Flame size={24} className="text-orange-500 fill-orange-500 group-hover:animate-bounce" />
          <div className="absolute inset-0 bg-orange-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase font-bold text-orange-500/80 leading-none">Streak</span>
          <span className="text-base font-black text-orange-500 leading-none">{currentStreak} Days</span>
        </div>
      </div>

      {/* Level Part */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
        <Zap size={22} className="text-primary fill-primary" />
        <div className="flex flex-col">
          <span className="text-xs uppercase font-bold text-primary/80 leading-none">Level</span>
          <span className="text-base font-black text-primary leading-none">{level}</span>
        </div>
      </div>
      
      {/* XP Progress Mini */}
      <div className="hidden sm:flex flex-col gap-1.5 min-w-[90px]">
        <div className="flex justify-between text-[11px] font-extrabold uppercase text-foreground/80">
          <span>XP</span>
          <span>{totalXp % 500} / 500</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000" 
            style={{ width: `${(totalXp % 500) / 5}%` }}
          />
        </div>
      </div>
    </div>
  );
}
