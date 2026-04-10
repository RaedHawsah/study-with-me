import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

/**
 * Bare root "/" path — middleware normally redirects before this runs,
 * but this acts as a safety net for edge cases (e.g. direct static export).
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
