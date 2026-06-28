'use client';

import { useGamificationStore, getLevelFromXp, getProgressToNextLevel } from '@/store/useGamificationStore';
import { Flame, Zap, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function StreakBadge() {
  const { t } = useTranslation('common');
  const { totalXp, currentStreak } = useGamificationStore();
  const level = getLevelFromXp(totalXp);

  return (
    <div className="flex flex-wrap justify-center items-center gap-3 bg-card/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl hover:scale-[1.02] transition-all cursor-default group">
      {/* Streak Part */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
        <div className="relative">
          <Flame size={24} className="text-orange-500 fill-orange-500 group-hover:animate-bounce" />
          <div className="absolute inset-0 bg-orange-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        </div>
        <div className="flex flex-col gap-1 justify-center">
          <span className="text-xs uppercase font-bold text-orange-500/80 leading-tight">{t('gami.streak', { defaultValue: 'Streak' })}</span>
          <span className="text-base font-black text-orange-500 leading-tight">
            {currentStreak} {t('gami.days', { defaultValue: 'Days' })}
          </span>
        </div>
      </div>

      {/* Level Part */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
        <Zap size={22} className="text-primary fill-primary" />
        <div className="flex flex-col gap-1 justify-center">
          <span className="text-xs uppercase font-bold text-primary/80 leading-tight">{t('gami.level', { defaultValue: 'Level' })}</span>
          <span className="text-base font-black text-primary leading-tight">{level}</span>
        </div>
      </div>
      
      {/* XP Progress Mini */}
      <div className="hidden sm:flex flex-col gap-1.5 min-w-[90px]">
        <div className="flex justify-between text-[11px] font-extrabold uppercase text-foreground/80">
          <span>XP</span>
          <span className="tabular-nums whitespace-nowrap" dir="ltr">
            {Math.round(totalXp).toLocaleString()} / {Math.round(getProgressToNextLevel(totalXp).nextLevelXp).toLocaleString()}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000" 
            style={{ width: `${getProgressToNextLevel(totalXp).progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
