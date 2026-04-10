import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { getTranslations } from '@/i18n/server';
import { TimerView } from '@/components/timer/TimerView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);
  return {
    title: `${t('nav.timer')} — ${t('app.name')}`,
    description:
      locale === 'ar'
        ? 'مؤقّت بومودورو قابل للتخصيص مع إدارة المهام.'
        : 'Customizable Pomodoro timer with integrated task management.',
  };
}

export default function TimerPage() {
  return <TimerView />;
}
