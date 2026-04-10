import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { getTranslations } from '@/i18n/server';
import { RoomView } from '@/components/room/RoomView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);
  return {
    title: `${t('nav.group')} — ${t('app.name')}`,
    description:
      locale === 'ar'
        ? 'ادرس مع الآخرين في غرف صامتة.'
        : 'Study with others in quiet group rooms.',
  };
}

export default function GroupPage() {
  return <RoomView />;
}
