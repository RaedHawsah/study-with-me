'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LogOut, 
  MessageSquareText, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  Settings2,
  Users,
  Video,
  VideoOff,
  Monitor
} from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useStudyRoom } from '@/hooks/useStudyRoom';
import { useMediaStream } from '@/hooks/useMediaStream';

export function RoomControls() {
  const { t } = useTranslation('common');
  const { toggleCamera, toggleScreenShare } = useMediaStream();
  const { 
    roomCode, 
    peers, 
    unreadCount, 
    chatOpen, 
    toggleChat, 
    roomType, 
    timerSync, 
    setTimerSync,
    myId,
    leaderId,
    cameraOn,
    screenOn,
    actions
  } = useRoomStore();
  
  const [copied, setCopied] = useState(false);
  const isLeader = myId === leaderId;
  const peerCount = Object.keys(peers).length + 1; // Including me

  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Secondary Controls (Code & Stats) */}
      <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Users size={12} className="text-primary" />
          {peerCount} {peerCount === 6 ? 'Full' : 'Studying'}
        </div>

        {roomType === 'private' && roomCode && (
          <button 
            onClick={copyCode}
            className="flex items-center gap-2 pl-3 pr-2 py-1 hover:bg-white/5 rounded-lg transition-all group border border-transparent hover:border-white/5"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Room:</span>
            <span className="text-xs font-mono font-bold text-foreground">{roomCode}</span>
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="opacity-40 group-hover:opacity-100" />}
          </button>
        )}
      </div>

      {/* Main Control Bar */}
      <div className="flex items-center justify-center gap-3 p-2 bg-card/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10">
        
        {/* Timer Sync Toggle (Only if Leader in Private Room) */}
        {roomType === 'private' && isLeader && (
          <button
            onClick={() => setTimerSync(!timerSync)}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all ${
              timerSync 
                ? 'bg-orange-500/20 text-orange-500' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={timerSync ? 'Sync On' : 'Sync Off'}
          >
            <Clock size={18} />
            <span className="text-[7px] font-black uppercase leading-none">{t('room.syncLabel', 'Sync')}</span>
          </button>
        )}

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            cameraOn 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
              : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
          }`}
          title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            screenOn 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
              : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
          }`}
          title={screenOn ? 'Stop Sharing' : 'Share Screen'}
        >
          <Monitor size={20} />
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Chat Toggle */}
        <button
          onClick={toggleChat}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            chatOpen
               ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110' 
               : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <MessageSquareText size={22} />
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-4 ring-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Leave Room */}
        <button
          onClick={() => actions?.leaveRoom()}
          className="group pl-4 pr-6 h-14 rounded-full flex items-center gap-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <LogOut size={20} />
          </div>
          <span className="text-sm uppercase tracking-wider">{t('room.leave', 'Exit Room')}</span>
        </button>
        
      </div>
    </div>
  );
}
