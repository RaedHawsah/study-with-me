'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { createClient } from '@/utils/supabase/client';
import { UserPlus, Users, Copy, Check, Search, Loader2, User as UserIcon } from 'lucide-react';

export function FriendSystem() {
  const { t } = useTranslation('common');
  const { user, profile } = useSupabaseAuth();
  const [friendCode, setFriendCode] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        friend:profiles!friendships_friend_id_fkey(id, full_name, avatar_url, level, xp)
      `)
      .eq('user_id', user?.id)
      .eq('status', 'accepted');

    if (!error && data) {
      setFriends(data.map((f: any) => f.friend));
    }
    setLoading(false);
  };

  const copyCode = () => {
    if (profile?.friend_code) {
      navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addFriend = async () => {
    if (!friendCode || friendCode.length < 5) return;
    setAdding(true);
    setMessage({ text: '', type: '' });

    // 1. Find friend by code
    const { data: friendProfile, error: findError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('friend_code', friendCode.trim())
      .single();

    if (findError || !friendProfile) {
      setMessage({ text: t('social.errorNotFound', { defaultValue: 'Friend code not found.' }), type: 'error' });
      setAdding(false);
      return;
    }

    if (friendProfile.id === user?.id) {
      setMessage({ text: t('social.errorSelf', { defaultValue: "You can't add yourself!" }), type: 'error' });
      setAdding(false);
      return;
    }

    // 2. Create friendship (auto-accept for now to keep it simple as requested)
    const { error: addError } = await supabase
      .from('friendships')
      .insert({
        user_id: user?.id,
        friend_id: friendProfile.id,
        status: 'accepted'
      });

    if (addError) {
      if (addError.code === '23505') {
        setMessage({ text: t('social.errorAlreadyFriends', { defaultValue: 'Already friends!' }), type: 'error' });
      } else {
        setMessage({ text: t('social.errorAdd', { defaultValue: 'Error adding friend.' }), type: 'error' });
      }
    } else {
      setMessage({ text: t('social.successAdd', { name: friendProfile.full_name, defaultValue: `Success! Added ${friendProfile.full_name}` }), type: 'success' });
      setFriendCode('');
      fetchFriends();
    }
    setAdding(false);
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6 mt-10">
      <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <UserPlus size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{t('social.addFriends', { defaultValue: 'Add Friends' })}</h3>
            <p className="text-sm text-muted-foreground">{t('social.competeDesc', { defaultValue: 'Compete and study together.' })}</p>
          </div>
        </div>

        {/* My Code Section */}
        <div className="bg-muted/30 p-4 rounded-2xl flex items-center justify-between border border-border/50">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('social.myFriendCode', { defaultValue: 'My Friend Code' })}</p>
            <p className="text-lg font-mono font-bold tracking-tighter text-foreground">{profile?.friend_code || '------'}</p>
          </div>
          <button 
            onClick={copyCode}
            className="p-2.5 rounded-xl bg-background hover:bg-muted border border-border transition-all active:scale-95"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
        </div>

        {/* Search Friend Section */}
        <div className="space-y-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder={t('social.enterFriendCode', { defaultValue: 'Enter Friend Code (e.g. a1b2c3d4)' })}
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl px-5 py-4 pr-12 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
            />
            <button 
              onClick={addFriend}
              disabled={adding || !friendCode}
              className="absolute right-2 top-2 p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:grayscale transition-all hover:shadow-lg hover:shadow-primary/20"
              style={{ direction: 'ltr' }}
            >
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
          {message.text && (
            <p className={`text-xs font-bold px-2 ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {message.text}
            </p>
          )}
        </div>

        {/* Friend List */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold flex items-center gap-2">
              <Users size={16} className="text-primary" />
              {t('social.friendList', { defaultValue: 'Friend List' })}
            </h4>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold">{t('social.friendsCount', { count: friends.length, defaultValue: `${friends.length} Friends` })}</span>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary/40" /></div>
            ) : friends.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground italic">{t('social.noFriends', { defaultValue: 'No friends added yet. Share your code!' })}</p>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl border border-transparent hover:border-border transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                    {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-primary/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{friend.full_name || 'Anonymous'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Level {friend.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-black text-primary">{friend.xp}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">XP</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
