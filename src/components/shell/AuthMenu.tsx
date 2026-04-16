'use client';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useGamificationStore, getLevelFromXp } from '@/store/useGamificationStore';
import { LogIn, LogOut, User as UserIcon, Zap } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function AuthMenu({ collapsed }: { collapsed?: boolean }) {
  const { user, loading, signInWithGoogle, signOut } = useSupabaseAuth();
  const { totalXp, fetchGamificationData } = useGamificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGamificationData();
    }
  }, [user, fetchGamificationData]);

  const level = getLevelFromXp(totalXp);

  if (loading) {
    return (
      <div className="w-full h-10 animate-pulse bg-sidebar-accent rounded-md flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
        title={collapsed ? "Login" : undefined}
      >
        <LogIn size={18} />
        {!collapsed && <span className="font-medium text-sm truncate">Sign In</span>}
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
      >
        {user.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            width={32}
            height={32}
            className="rounded-full w-8 h-8 shrink-0 border border-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <UserIcon size={16} />
          </div>
        )}

        {!collapsed && (
          <div className="flex flex-col items-start overflow-hidden text-start">
            <span className="text-sm font-semibold text-foreground truncate w-full">
              {user.user_metadata?.full_name || 'Student'}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full">
              {user.email}
            </span>
          </div>
        )}
      </button>

      {/* Flyout menu */}
      {isOpen && (
        <div className={`
          absolute bottom-full mb-2 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden z-[100]
          ${collapsed ? 'start-full ms-2 w-48' : 'start-0 w-full'}
        `}>
          <div className="p-3 border-b border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">My Profile</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                <Zap size={10} fill="currentColor" />
                LVL {level}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                <span>Experience</span>
                <span>{totalXp} XP</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${(totalXp % 500) / 5}%` }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              signOut();
            }}
            className="flex items-center gap-2 w-full p-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
