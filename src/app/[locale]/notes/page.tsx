import { NotesManager } from '@/components/notes/NotesManager';
import { Locale } from '@/i18n/config';

export default function NotesPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in-up">
      {/* Header section (optional depending on taste, NotesManager is mostly self-contained) */}
      <div className="flex flex-col gap-1 px-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground drop-shadow-sm">
          {locale === 'ar' ? 'ملاحظاتي' : 'My Notes'}
        </h1>
        <p className="text-muted-foreground">
          {locale === 'ar' 
            ? 'احفظ أفكارك، ملخصات دراستك، وملاحظاتك الهامة.' 
            : 'Save your thoughts, study summaries, and important notes.'}
        </p>
      </div>

      <NotesManager locale={locale} />
    </div>
  );
}
