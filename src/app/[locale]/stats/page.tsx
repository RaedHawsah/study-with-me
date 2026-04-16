import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { getTranslations } from '@/i18n/server';
import { Leaderboard } from '@/components/gamification/Leaderboard';
import { FriendSystem } from '@/components/social/FriendSystem';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);
  return {
    title: `${t('nav.stats', 'Stats & Leaderboard')} — ${t('app.name')}`,
  };
}

export default function StatsPage() {
  return (
    <div className="flex flex-col items-center p-4 py-8 overflow-y-auto h-[calc(100vh-100px)] gap-10">
      <Leaderboard />
      <div className="w-full max-w-xl h-px bg-border/50" />
      <FriendSystem />
    </div>
  );
}
