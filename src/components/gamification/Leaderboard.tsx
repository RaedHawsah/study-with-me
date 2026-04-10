'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Medal, MapPin, User as UserIcon } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';

// Mock Data for the Leaderboard
const MOCK_LEADERBOARD = [
  { id: '1', name: 'Zainab A.', xp: 14500, avatar: 'ZA', group: 'King Saud Univ.' },
  { id: '2', name: 'Omar K.', xp: 12200, avatar: 'OK', group: 'MIT' },
  { id: '3', name: 'Amira F.', xp: 9850, avatar: 'AF', group: 'Harvard' },
  { id: '4', name: 'You (Current)', xp: 0, avatar: 'ME', group: 'Independent' },
  { id: '5', name: 'Sarah M.', xp: 450, avatar: 'SM', group: 'King Saud Univ.' },
];

export function Leaderboard() {
  const { t } = useTranslation('common');
  const [tab, setTab] = useState<'global' | 'group'>('global');
  const { totalXp } = useGamificationStore();

  // Inject current user live XP into the mock data
  const boardData = [...MOCK_LEADERBOARD];
  boardData[3].xp = totalXp;
  
  const sortedBoard = boardData
    .filter(u => tab === 'global' ? true : u.group === 'King Saud Univ.')
    .sort((a, b) => b.xp - a.xp);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="text-yellow-500" size={32} />
            {t('gami.leaderboard', { defaultValue: 'Leaderboard' })}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('gami.rankDesc', { defaultValue: 'Ranked by total Study XP.' })}
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
          {t('gami.global', { defaultValue: 'Global' })}
        </button>
        <button
          onClick={() => setTab('group')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            tab === 'group' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          {t('gami.university', { defaultValue: 'My University' })}
        </button>
      </div>

      {/* Ranks list */}
      <div className="w-full bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-2 shadow-2xl flex flex-col gap-2">
        {sortedBoard.map((user, index) => {
          const isMe = user.id === '4';
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-inner ${
                isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {user.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 overflow-hidden">
                <h4 className="font-bold text-base truncate flex items-center gap-2">
                  {user.name}
                  {isMe && <span className="bg-primary px-2 py-0.5 rounded-full text-[10px] text-primary-foreground uppercase tracking-wider">You</span>}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin size={12} />
                  <span className="truncate">{user.group}</span>
                </div>
              </div>

              {/* XP Score */}
              <div className="text-right">
                <p className="font-mono font-bold text-lg text-primary tracking-tight">
                  {user.xp.toLocaleString()}
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
