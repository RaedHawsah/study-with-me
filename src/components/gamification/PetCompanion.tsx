'use client';

import { useMemo, useState } from 'react';
import { useGamificationStore, getLevelFromXp, getProgressToNextLevel } from '@/store/useGamificationStore';
import { useTranslation } from 'react-i18next';
import { Settings2, X, Check } from 'lucide-react';

const CHARACTERS = [
  {
    id: 'lofi_boy',
    name: 'Lofi Boy',
    src: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXQyZHF4dmNtMXBjM2tyMW1zZHZxNmxtZnFpZG94aDB6OHBoaG82NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/j0yDs1uIaBD8LrlwId/giphy.gif'
  },
  {
    id: 'sleepy_cat',
    name: 'Luna',
    src: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm40cHpmYWlvOHdzaGcwenI0dG43MDJ5aWJlcG5pcHJ6b3Jncjh0YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/7MDDWiok76ZqlXxXUO/giphy.gif'
  },
  {
    id: 'lofi_girl',
    name: 'Lofi Girl',
    src: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbndvajEwdW92dHk4N2l3aXM0MW84OWNlYXE3NjE1aThhbDhlOGJ6bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/2DMN31jEeBLVJQGXz6/giphy.gif'
  },
  {
    id: 'anime_room',
    name: 'Chill Anime',
    src: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzdhdGd5em41djg0MW9tNndubjVvaTVtOHNucDRjcmdvM3RwcGs4cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/pLtxNjlBzFHaSqfTSk/giphy.gif'
  },
  {
    id: 'cozy_night',
    name: 'Cozy Night',
    src: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGhubnNkODY0bnI0aDR1NjR2cTk2ZjE2eThoYjB4ZHUyNTdocGUxMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Zs92908g88ppxzp84u/giphy.gif'
  },
  {
    id: 'CAT',
    name: 'Kitty',
    src: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGdiNXppcm0zNjBrejh5YnU1eWJzeXY5N2tlbmZpaDVtYmR5N3BuZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/rht3WT0AuF9tU93WHN/giphy.gif'
  },
  {
    id: 'study_buddy',
    name: 'Study Buddy',
    src: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExenc1ZXZobWZpN2ttZDVnMmRqbmxtN3ZleHV6d3g1bWRucnFjczNiaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SJx3txxLd2DZjfZPs7/giphy.gif'
  },
  {
    id: 'focus_room',
    name: 'Focus Room',
    src: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3F3aW02N3g2cDM5djBjZW5pbjZqa3ZoaXNjd2l0bmU5dmQ4Y3ZiMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/O3iQdGPDD1Oc9Q71HG/giphy.gif'
  },
  {
    id: 'work_mode',
    name: 'Work Mode',
    src: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExampwZzRpcXV5NThtcXF3YzczMGo2bWI1N3NiMzY1eDRpbjJ4ZmtsayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/QOguv4N5fMuQ9YLHZl/giphy.gif'
  },
  {
    id: 'late_night',
    name: 'Late Night',
    src: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHhoZGpmbXU0dmc3bDQzbGcxdHBqMzltcmdnbm1qZ3Y0NHdoNjBqZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/1ncrtDcmiBiGbi711e/giphy.gif'
  },
  {
    id: 'deep_focus',
    name: 'Deep Focus',
    src: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExb241bjN0bGo4YTM0M2o5MnU0M2JjczJybWltbGU1YjQ4aHM0Nnk4MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/apbJBFaw5rDt1rQ4T9/giphy.gif'
  },
  {
    id: 'chill_vibes',
    name: 'Chill Vibes',
    src: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnVkcDRkNDlpeTJ0bWEzMHdiaTV0cDhzY2IwN3puenl1d25teWpldSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/h2MouomJFCpMfWVfUj/giphy.gif'
  },
  {
    id: 'pixel_room',
    name: 'Pixel Room',
    src: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGgxZXVpbG5kNXB4Y3F5aTl1aW9pbHJ4aDd0YnhkNjNlNjZ1Zml5eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/CpAoNQKJRLAIDhGKST/giphy.gif'
  },
  {
    id: 'typing_cat',
    name: 'Typing Cat',
    src: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXR5YmR0dGh3Y3hkdzB3dWZlZmh1bHBkZjFxcTA3ZnJzMnBzOTFlcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/woBxnEPUoxWIGF0YuQ/giphy.gif'
  }
];

export function PetCompanion() {
  const { t, i18n } = useTranslation('common');
  const { activePetName, totalXp, activePetType, setActivePet } = useGamificationStore();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const currentLvl = getLevelFromXp(totalXp);
  const { currentLevelXp, nextLevelXp, progressPercent } = useMemo(() => getProgressToNextLevel(totalXp), [totalXp]);

  const petMediaSrc = useMemo(() => {
    const found = CHARACTERS.find(c => c.id === activePetType);
    if (found) return found.src;
    // Fallback if not found
    switch (activePetType) {
      default: return CHARACTERS[1].src; // Luna
    }
  }, [activePetType]);

  const isGif = petMediaSrc.includes('.gif');

  return (
    <div className="w-full flex justify-center py-4 relative">
      {/* إطار السايبر: إطار بحدود نيون مشعة */}
      <div
        className="relative w-full max-w-[320px] aspect-square bg-card/60 backdrop-blur-md rounded-[2.5rem] border-2 overflow-hidden flex flex-col items-center"
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
              alt={activePetName || 'Character'}
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

          {/* Character Change Button */}
          <button
            onClick={() => setSelectorOpen(true)}
            className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-primary/80 text-white backdrop-blur-md rounded-xl border border-white/10 transition-all shadow-lg z-20 group"
            title={i18n.language === 'ar' ? 'تغيير الشخصية' : 'Change Character'}
          >
            <Settings2 size={16} className="group-hover:rotate-90 transition-transform" />
          </button>
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

      {/* Character Selector Modal */}
      {selectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card/60 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-transparent">
              <h2 className="text-xl font-bold text-foreground">
                {i18n.language === 'ar' ? 'اختار شخصيتك' : 'Choose Your Character'}
              </h2>
              <button
                onClick={() => setSelectorOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Grid */}
            <div className="p-5 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar">
              {CHARACTERS.map((char) => {
                const isActive = activePetType === char.id || (activePetType === null && char.id === 'sleepy_cat');
                const isItemGif = char.src.includes('.gif');
                return (
                  <button
                    key={char.id}
                    onClick={() => {
                      setActivePet(char.id, char.name);
                      setSelectorOpen(false);
                    }}
                    className={`relative flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all overflow-hidden group ${
                      isActive 
                        ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20 scale-105' 
                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-105'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden relative bg-black/40">
                      {isItemGif ? (
                        <img src={char.src} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <video src={char.src} muted loop autoPlay playsInline className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none" />
                      
                      {isActive && (
                        <div className="absolute top-2 right-2 p-1 bg-primary text-primary-foreground rounded-full shadow-lg animate-in zoom-in">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {char.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}