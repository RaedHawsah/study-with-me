'use client';

import { useMemo } from 'react';
import { useGamificationStore, getLevelFromXp, getProgressToNextLevel } from '@/store/useGamificationStore';
import { useTranslation } from 'react-i18next';

// ─── UI Container ────────────────────────────────────────────────────────────

export function PetCompanion() {
  const { t } = useTranslation('common');
    const { activePetName, totalXp, activePetType } = useGamificationStore();
  
    const currentLvl = getLevelFromXp(totalXp);
    const { currentLevelXp, nextLevelXp, progressPercent } = useMemo(() => getProgressToNextLevel(totalXp), [totalXp]);
  
    const petMediaSrc = useMemo(() => {
      switch (activePetType) {
        case 'DOG': return '/cute-dog.mp4';
        case 'FALCON': return '/cute-falcon.mp4';
        case 'EGG': return '/egg.mp4';
        default: return 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGdiNXppcm0zNjBrejh5YnU1eWJzeXY5N2tlbmZpaDVtYmR5N3BuZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/rht3WT0AuF9tU93WHN/giphy.gif';
      }
    }, [activePetType]);

    const isGif = petMediaSrc.includes('.gif');

    return (
      <div className="w-full flex justify-center py-4">
        {/* إطار السايبر: إطار بحدود نيون مشعة */}
        <div
          className="relative w-full max-w-[320px] aspect-square bg-card/40 backdrop-blur-xl rounded-[2.5rem] border-2 overflow-hidden flex flex-col items-center"
          style={{
            borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
            boxShadow: '0 0 20px color-mix(in srgb, var(--primary) 30%, transparent)',
          }}
        >
  
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background -z-10" />
  
          {/* Media Container  */}
          <div className="w-full flex-1 relative min-h-[180px]">
            {isGif ? (
              <img
                key={petMediaSrc}
                src={petMediaSrc}
                alt={activePetName || 'Luna'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <video
                key={petMediaSrc}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                src={petMediaSrc}
              />
            )}
          {/* تأثير حواف مظللة قليلاً لدمج الفيديو مع الإطار */}
          <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] pointer-events-none" />
        </div>

        {/* Pet Stats UI Bar */}
        <div className="w-full bg-card/60 backdrop-blur-md border-t border-white/10 p-5 z-10 flex flex-col gap-2 rounded-b-[2.5rem]">
          <div className="flex justify-between items-end w-full px-1">
            <div>
              <h3 className="font-bold text-foreground text-lg leading-tight">{activePetName || 'Luna'}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {t('gami.level', { defaultValue: 'Level' })} {currentLvl}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-mono">
                {totalXp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner flex relative">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
            {progressPercent >= 99 && (
              <div className="absolute top-0 left-0 w-full h-full animate-pulse bg-white/40" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}