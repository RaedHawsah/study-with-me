'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Medal, MapPin, User as UserIcon, Loader2, Zap } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { createClient } from '@/utils/supabase/client';

interface LeaderboardUser {
  id: string;
  full_name: string;
  avatar_url: string;
  xp: number;
  level: number;
}


export function Leaderboard() {
  const { t } = useTranslation('common');
  const [tab, setTab] = useState<'global' | 'friends'>('global');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useSupabaseAuth();
  const currentUserId = authUser?.id;
  const { totalXp } = useGamificationStore();
  const { i18n } = useTranslation('common');

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const supabase = createClient();
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      let query;

      if (tab === 'friends' && currentUser) {
        // Fetch friend IDs
        const { data: friendships } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', currentUser.id)
          .eq('status', 'accepted');
          
        const friendIds = friendships?.map((f: { friend_id: string }) => f.friend_id) || [];
        // Add self to the leaderboard
        friendIds.push(currentUser.id);

        query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, xp, level')
          .in('id', friendIds)
          .order('xp', { ascending: false })
          .limit(20);
      } else {
        // Global
        query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, xp, level')
          .order('xp', { ascending: false })
          .limit(20);
      }

      const { data, error } = await query;

      if (!error && data) {
        setUsers(data as LeaderboardUser[]);
      }
      setLoading(false);
    }

    fetchLeaderboard();
  }, [tab]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted-foreground animate-pulse font-medium">Loading high scores...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="text-yellow-500" size={32} />
            {i18n.language === 'ar' ? 'لوحة الصدارة' : t('gami.leaderboard', { defaultValue: 'Leaderboard' })}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {i18n.language === 'ar' ? 'الترتيب حسب إجمالي وقت الدراسة وكفاءة التركيز.' : t('gami.rankDesc', { defaultValue: 'Ranked by total Study XP.' })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-card border border-border rounded-xl">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'global' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          {i18n.language === 'ar' ? 'عالمي' : t('gami.global', { defaultValue: 'Global' })}
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'friends' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          {i18n.language === 'ar' ? 'الأصدقاء' : 'Friends'}
        </button>
      </div>

      {/* Ranks list */}
      <div className="w-full bg-card/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl flex flex-col gap-2">
        {users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground italic">
            No entries found yet. Start studying to be the first!
          </div>
        ) : users.map((user, index) => {
          const isMe = user.id === currentUserId; 
          
          return (
            <div 
              key={user.id} 
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.01] ${
                isMe ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'bg-background/80 hover:bg-muted/50'
              }`}
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-8 flex justify-center">
                {index === 0 ? <Medal size={28} className="text-yellow-400 drop-shadow-md" /> :
                 index === 1 ? <Medal size={26} className="text-slate-300 drop-shadow-md" /> :
                 index === 2 ? <Medal size={24} className="text-amber-600 drop-shadow-md" /> :
                 <span className="font-bold text-muted-foreground font-mono text-lg">{index + 1}</span>}
              </div>

              {/* Avatar */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-inner overflow-hidden shadow-primary/20 ${
                isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.full_name?.charAt(0) || <UserIcon size={20} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 overflow-hidden">
                <h4 className="font-bold text-base truncate flex items-center gap-2">
                  {user.full_name || 'Anonymous Student'}
                  {isMe && <span className="bg-primary px-2 py-0.5 rounded-full text-[10px] text-primary-foreground uppercase tracking-wider">You</span>}
                </h4>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-tighter">
                  <Zap size={10} className="text-primary" fill="currentColor" />
                  Level {user.level || 1}
                </div>
              </div>

              {/* XP Score */}
              <div className="text-right">
                <p className="font-mono font-bold text-lg text-primary tracking-tight">
                  {(user.xp || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">XP</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
