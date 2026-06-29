'use client';

import { useState, useEffect } from 'react';
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
  Monitor,
  Mic,
  MicOff
} from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useStudyRoom } from '@/hooks/useStudyRoom';
import { useMediaStream } from '@/hooks/useMediaStream';
import { useShallow } from 'zustand/react/shallow';

export function RoomControls() {
  const { t } = useTranslation('common');
  const { toggleCamera, toggleScreenShare, toggleMic } = useMediaStream();
  const { 
    roomCode, 
    peerCount, 
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
    micOn,
    actions
  } = useRoomStore(
    useShallow((state) => ({
      roomCode: state.roomCode,
      peerCount: Object.keys(state.peers).length + 1,
      unreadCount: state.unreadCount,
      chatOpen: state.chatOpen,
      toggleChat: state.toggleChat,
      roomType: state.roomType,
      timerSync: state.timerSync,
      setTimerSync: state.setTimerSync,
      myId: state.myId,
      leaderId: state.leaderId,
      cameraOn: state.cameraOn,
      screenOn: state.screenOn,
      micOn: state.micOn,
      actions: state.actions
    }))
  );
  
  const [copied, setCopied] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const isLeader = myId === leaderId;

  useEffect(() => {
    setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 md:gap-4">
      {/* Secondary Controls (Code & Stats) */}
      <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Users size={11} className="text-primary" />
          {peerCount} {peerCount === 6 ? t('room.full', { defaultValue: 'Full' }) : t('room.studying', { defaultValue: 'Studying' })}
        </div>

        {roomType === 'private' && roomCode && (
          <button 
            onClick={copyCode}
            className="flex items-center gap-1.5 ps-2 pe-1.5 py-1 hover:bg-white/5 rounded-lg transition-all group border border-transparent hover:border-white/5"
          >
            <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">{t('room.room', { defaultValue: 'Room:' })}</span>
            <span className="text-[10px] md:text-xs font-mono font-bold text-foreground">{roomCode}</span>
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="opacity-40 group-hover:opacity-100" />}
          </button>
        )}
      </div>

      {/* Main Control Bar */}
      <div className="flex items-center justify-center gap-1.5 md:gap-3 p-1.5 md:p-2 bg-card/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl ring-1 ring-white/10">
        
        {/* Timer Sync Toggle (Only if Leader in Private Room) */}
        {roomType === 'private' && isLeader && (
          <button
            onClick={() => setTimerSync(!timerSync)}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all ${
              timerSync 
                ? 'bg-orange-500/20 text-orange-500' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={timerSync ? 'Sync On' : 'Sync Off'}
          >
            <Clock size={15} />
            <span className="text-[6px] md:text-[7px] font-black uppercase leading-none">{t('room.syncLabel', 'Sync')}</span>
          </button>
        )}

        {/* Mic Toggle (Private rooms only) */}
        {roomType === 'private' && (
          <button
            onClick={toggleMic}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
              micOn 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
            }`}
            title={micOn ? 'Mute Microphone' : 'Turn Microphone On'}
          >
            {micOn ? <Mic size={17} /> : <MicOff size={17} />}
          </button>
        )}

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
            cameraOn 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
              : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
          }`}
          title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {cameraOn ? <Video size={17} /> : <VideoOff size={17} />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
            screenOn 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
              : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
          }`}
          title={screenOn ? 'Stop Sharing' : 'Share Screen'}
        >
          <Monitor size={17} />
        </button>

        <div className="w-px h-7 bg-white/10 mx-0.5 md:mx-1" />

        {/* Chat Toggle */}
        <button
          onClick={toggleChat}
          className={`relative w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${
            chatOpen
               ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110' 
               : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <MessageSquareText size={19} />
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute top-0 end-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="w-px h-7 bg-white/10 mx-0.5 md:mx-1" />

        {/* Leave Room */}
        <button
          onClick={() => actions?.leaveRoom()}
          className="group ps-3 md:ps-4 pe-4 md:pe-6 h-11 md:h-14 rounded-full flex items-center gap-2 md:gap-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <LogOut size={16} />
          </div>
          <span className="text-xs md:text-sm uppercase tracking-wider hidden sm:inline">{t('room.leave', 'Exit Room')}</span>
        </button>
        
      </div>
    </div>
  );
}
