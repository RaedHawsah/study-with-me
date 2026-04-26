import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { getTranslations } from '@/i18n/server';
import { Palette, Music2 } from 'lucide-react';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { AmbientMixer } from '@/components/audio/AmbientMixer';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);
  return { title: t('settings.title') };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {t('settings.title')}
      </h1>

      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="appearance-heading"
        className="
          flex flex-col gap-6 p-6
          bg-card/85 backdrop-blur-2xl rounded-3xl border border-white/10
          shadow-2xl
        "
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary"
          >
            <Palette size={16} strokeWidth={2} />
          </span>
          <h2
            id="appearance-heading"
            className="text-base font-semibold text-foreground"
          >
            {t('settings.appearance')}
          </h2>
        </div>
        <ThemePicker />
      </section>

      {/* ── Ambient Sounds ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="mixer-heading"
        className="
          flex flex-col gap-6 p-6
          bg-card/85 backdrop-blur-2xl rounded-3xl border border-white/10
          shadow-2xl
        "
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent"
          >
            <Music2 size={16} strokeWidth={2} />
          </span>
          <div />
        </div>
        <AmbientMixer />
      </section>
    </div>
  );
}
