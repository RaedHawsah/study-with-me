'use client';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { User as UserIcon, LogOut, LogIn } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export function AccountSettings() {
  const { t } = useTranslation('common');
  const { user, loading, signInWithGoogle, signOut } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="w-full h-16 animate-pulse bg-white/5 rounded-xl flex items-center p-4">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground">
            <UserIcon size={24} />
          </div>
          <div className="text-start">
            <p className="text-sm font-semibold text-foreground">{t('auth.notSignedIn', { defaultValue: 'Not signed in' })}</p>
            <p className="text-xs text-muted-foreground">{t('auth.signInPrompt', { defaultValue: 'Sign in to save your progress and sync settings.' })}</p>
          </div>
        </div>
        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold transition-colors shrink-0"
        >
          <LogIn size={18} />
          <span>{t('auth.signIn', { defaultValue: 'Sign In' })}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-4 w-full">
        <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden border-2 border-white/10 shadow-lg">
          {user.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center">
              <UserIcon size={24} />
            </div>
          )}
        </div>
        <div className="text-start flex-1 min-w-0">
          <p className="text-base font-bold text-foreground truncate">
            {user.user_metadata?.full_name || 'User'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      </div>
      
      <button
        onClick={signOut}
        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold transition-colors shrink-0 w-full sm:w-auto"
      >
        <LogOut size={18} />
        <span>{t('auth.signOut', { defaultValue: 'Sign Out' })}</span>
      </button>
    </div>
  );
}
