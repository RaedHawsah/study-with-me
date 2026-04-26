import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { getTranslations } from '@/i18n/server';
import { NotesManager } from '@/components/notes/NotesManager';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);
  return {
    title: `${t('nav.notes')} — ${t('app.name')}`,
  };
}

export default async function NotesPage({ params }: Props) {
  const { locale } = await params;
  const { t } = await getTranslations(locale as Locale);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in-up">
      <div className="flex flex-col gap-1 px-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground drop-shadow-sm">
          {t('notes.page_title')}
        </h1>
        <p className="text-muted-foreground">
          {t('notes.page_subtitle')}
        </p>
      </div>

      <NotesManager locale={locale as Locale} />
    </div>
  );
}
