'use client';

import { useTranslation } from 'react-i18next';
import { FriendSystem } from '@/components/social/FriendSystem';
import { UserPlus } from 'lucide-react';

export default function FriendsPage() {
  const { t, i18n } = useTranslation('common');
  const isAr = i18n.language === 'ar';

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pt-4 md:pt-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <UserPlus size={28} className="text-primary" />
            </div>
            {isAr ? 'الأصدقاء' : t('nav.friends', { defaultValue: 'Friends' })}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {isAr ? 'تواصل وتنافس مع أصدقائك وتابع مستوياتهم' : 'Connect, compete, and track your friends progress.'}
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-border/50" />

      {/* Render the core friend system component */}
      <div className="w-full pb-safe">
        <FriendSystem />
      </div>
    </div>
  );
}
