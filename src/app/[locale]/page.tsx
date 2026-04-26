'use client';

import { useTranslation } from 'react-i18next';
import { BookMarked, Flame, Clock } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function HomePage() {
  const { t } = useTranslation('common');
  const { user } = useSupabaseAuth();
  const { weeklyStudyMinutes, currentStreak } = useGamificationStore();

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {!user && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm flex items-center justify-between gap-4">
          <p>
            <strong>{t('common.info', { defaultValue: 'Guest Mode' })}:</strong> {t('auth.guestWarning', { defaultValue: 'Sign in to save your study progress, XP, and notes to the cloud.' })}
          </p>
          <button 
            onClick={() => (document.getElementById('nav-settings') as HTMLElement)?.click()}
            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors shrink-0"
          >
            {t('common.signIn', { defaultValue: 'Sign In' })}
          </button>
        </div>
      )}

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="greeting-heading">
        <div className="flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="
              inline-flex items-center justify-center
              w-14 h-14 rounded-xl
              bg-primary/10 text-primary mb-2
            "
          >
            <BookMarked size={28} strokeWidth={2} />
          </div>
          <h1
            id="greeting-heading"
            className="text-3xl font-bold tracking-tight text-foreground"
          >
            {user ? `${t('home.greeting')}, ${user.user_metadata?.full_name || user.email?.split('@')[0]}` : t('home.greeting')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('app.tagline')}
          </p>
        </div>
      </section>

      {/* ── Quick Stats ───────────────────────────────────────────────────── */}
      <section aria-labelledby="stats-heading" className="grid grid-cols-2 gap-4">
        <h2 id="stats-heading" className="sr-only">
          {t('nav.stats')}
        </h2>

        {/* Minutes studied card */}
        <div
          className="
            flex flex-col gap-3 p-5
            bg-card/60 backdrop-blur-md rounded-lg border border-white/10
            shadow-[var(--shadow-sm)]
            transition-theme
          "
        >
          <div
            className="
              inline-flex items-center justify-center
              w-10 h-10 rounded-md
              bg-primary/10 text-primary
            "
          >
            <Clock size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {weeklyStudyMinutes}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('home.minutesStudied')}
            </p>
          </div>
        </div>

        {/* Streak card */}
        <div
          className="
            flex flex-col gap-3 p-5
            bg-card/60 backdrop-blur-md rounded-lg border border-white/10
            shadow-[var(--shadow-sm)]
            transition-theme
          "
        >
          <div
            className="
              inline-flex items-center justify-center
              w-10 h-10 rounded-md
              bg-accent/15 text-accent
            "
          >
            <Flame size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {currentStreak}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('home.streakDays')}
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section>
        <p className="text-sm text-muted-foreground mb-4">
          {weeklyStudyMinutes === 0 
            ? t('home.noSessions') 
            : t('home.keepGoing', { defaultValue: 'Keep up the great work!' })}
        </p>
        <button
          onClick={() => window.location.href = './timer'}
          id="home-start-session"
          className="
            inline-flex items-center justify-center gap-2
            px-6 py-3 rounded-lg
            bg-primary text-primary-foreground
            text-sm font-semibold
            shadow-[var(--shadow-md)]
            hover:bg-primary-hover
            transition-theme
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          {t('home.startSession')}
        </button>
      </section>
    </div>
  );
}
