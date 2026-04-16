'use client';

/**
 * NavShell — responsive navigation shell.
 *
 * Desktop (md+): Fixed sidebar on the inline-start edge.
 *   • Uses logical CSS properties (start-0, border-e, ps-*) so it
 *     automatically moves to the RIGHT in RTL without extra code.
 *   • Collapsible to icon-only mode.
 *
 * Mobile (<md): Fixed bottom tab bar.
 *   • Respects Capacitor/iOS safe-area via .pb-safe utility.
 *
 * All nav labels come from i18next and are fully translated.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Timer,
  BookOpen,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { LocaleSwitcher } from './LocaleSwitcher';
import { GlobalAmbience } from '../audio/GlobalAmbience';
import { GlobalTimerInitializer } from '@/hooks/usePomodoro';
import { AuthMenu } from './AuthMenu';
import { StoreInitializer } from './StoreInitializer';
import type { Locale } from '@/i18n/config';
import { isRtl } from '@/i18n/config';

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

function buildNavItems(locale: Locale): NavItem[] {
  const base = `/${locale}`;
  return [
    { key: 'home',     href: base,               icon: Home,      labelKey: 'nav.home' },
    { key: 'timer',    href: `${base}/timer`,     icon: Timer,     labelKey: 'nav.timer' },
    { key: 'group',    href: `${base}/group`,     icon: Users,     labelKey: 'nav.group' },
    { key: 'notes',    href: `${base}/notes`,     icon: BookOpen,  labelKey: 'nav.notes' },
    { key: 'stats',    href: `${base}/stats`,     icon: BarChart2, labelKey: 'nav.stats' },
    { key: 'settings', href: `${base}/settings`,  icon: Settings,  labelKey: 'nav.settings' },
  ];
}

interface NavShellProps {
  locale: Locale;
  children: React.ReactNode;
}

export function NavShell({ locale, children }: NavShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const rtl = isRtl(locale);

  const navItems = buildNavItems(locale);

  function isActive(href: string): boolean {
    if (href === `/${locale}`) return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname.startsWith(href);
  }

  // In RTL the sidebar is on the right, so the chevron direction flips
  const CollapseIcon = rtl
    ? collapsed ? ChevronLeft : ChevronRight
    : collapsed ? ChevronRight : ChevronLeft;

  return (
    <>
      <GlobalTimerInitializer />
      <StoreInitializer />

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside
        aria-label={t('nav.home')}
        style={{ width: collapsed ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)' }}
        className="
          hidden md:flex flex-col
          fixed inset-y-0 start-0 z-[var(--z-sidebar)]
          bg-sidebar border-e border-sidebar-border
          transition-[width] duration-[var(--duration-normal)] ease-out
          overflow-hidden
        "
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div
            aria-hidden="true"
            className="
              flex items-center justify-center shrink-0
              w-8 h-8 rounded-md bg-primary text-primary-foreground
              shadow-[var(--shadow-sm)]
            "
          >
            <BookMarked size={16} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground text-sm tracking-tight truncate">
              {t('app.name')}
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 p-2 pt-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                id={`nav-${item.key}`}
                title={collapsed ? t(item.labelKey) : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md
                  text-sm font-medium transition-theme
                  group relative
                  ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-fg'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-fg'
                  }
                `}
              >
                {/* Active indicator bar */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="
                      absolute inset-y-1 start-0 w-0.5 rounded-full
                      bg-primary
                    "
                  />
                )}

                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 2}
                  className="shrink-0"
                  aria-hidden="true"
                />

                {!collapsed && (
                  <span className="truncate">{t(item.labelKey)}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer controls */}
        <div className="shrink-0 flex flex-col gap-2 p-2 border-t border-sidebar-border relative">
          <AuthMenu collapsed={collapsed} />
          
          <div className="w-full h-px bg-sidebar-border hidden md:block" />
          
          <LocaleSwitcher locale={locale} collapsed={collapsed} />

          {/* Collapse toggle */}
          <button
            id="sidebar-collapse-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="
              flex items-center justify-center gap-2 w-full px-3 py-2
              rounded-md text-muted-foreground text-sm
              hover:bg-sidebar-accent hover:text-sidebar-accent-fg
              transition-theme
            "
          >
            <CollapseIcon size={16} strokeWidth={2} aria-hidden="true" />
            {!collapsed && (
              <span className="truncate text-xs">
                {t('common.back')}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginInlineStart: collapsed
            ? 'var(--sidebar-width-icon)'
            : 'var(--sidebar-width)',
        }}
        className="
          hidden md:flex flex-col min-h-screen
          transition-[margin-inline-start] duration-[var(--duration-normal)] ease-out
        "
      >
        <main id="main-content" className="flex-1 p-6 lg:p-10 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile Layout ───────────────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col min-h-[100dvh] overflow-hidden">
        <main id="main-content-mobile" className="flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6 pb-28">
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav
          aria-label={t('nav.home')}
          className="
            fixed bottom-0 inset-x-0 z-[var(--z-sidebar)]
            bg-sidebar border-t border-sidebar-border
            pb-safe
          "
        >
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  id={`tab-${item.key}`}
                  className={`
                    flex flex-col items-center justify-center gap-1
                    flex-1 h-full text-xs font-medium
                    transition-theme
                    ${
                      active
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-sidebar-foreground'
                    }
                  `}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  <span className="leading-none">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Global Ambient Audio Dock */}
      <GlobalAmbience />
    </>
  );
}
