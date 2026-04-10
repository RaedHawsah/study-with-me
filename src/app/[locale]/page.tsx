import { getTranslations } from '@/i18n/server';
import type { Locale } from '@/i18n/config';
import { BookMarked, Flame, Clock } from 'lucide-react';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);

  return (
    <div className="flex flex-col gap-8">
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
            {t('home.greeting')}
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
            bg-card rounded-lg border border-border
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
            <p className="text-2xl font-bold text-foreground tabular-nums">0</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('home.minutesStudied')}
            </p>
          </div>
        </div>

        {/* Streak card */}
        <div
          className="
            flex flex-col gap-3 p-5
            bg-card rounded-lg border border-border
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
            <p className="text-2xl font-bold text-foreground tabular-nums">0</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('home.streakDays')}
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section>
        <p className="text-sm text-muted-foreground mb-4">
          {t('home.noSessions')}
        </p>
        <a
          href={`/${locale}/timer`}
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
        </a>
      </section>
    </div>
  );
}
