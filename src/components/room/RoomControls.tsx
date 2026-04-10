'use client';

import { useTranslation } from 'react-i18next';
import { Camera, CameraOff, Monitor, LogOut, MessageSquareText } from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useStudyRoom } from '@/hooks/useStudyRoom';

export function RoomControls() {
  const { t } = useTranslation('common');
  const { toggleCamera, toggleScreen, leaveRoom } = useStudyRoom();
  const { cameraOn, screenOn, unreadCount, chatOpen, toggleChat } = useRoomStore();

  return (
    <div className="flex items-center justify-center gap-3 w-full max-w-sm mx-auto p-2 bg-card/60 backdrop-blur-xl border border-border rounded-2xl shadow-lg">
      
      {/* Camera Toggle */}
      <button
        onClick={toggleCamera}
        aria-label={cameraOn ? t('room.cameraOff') : t('room.cameraOn')}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          cameraOn 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={toggleScreen}
        aria-label={t('room.shareScreen')}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          screenOn 
            ? 'bg-primary/20 text-primary' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <Monitor size={20} />
      </button>

      {/* Chat Toggle */}
      <button
        onClick={toggleChat}
        aria-label={t('room.chat')}
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          chatOpen
             ? 'bg-primary/20 text-primary' 
             : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <MessageSquareText size={20} />
        {unreadCount > 0 && !chatOpen && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Leave Room */}
      <button
        onClick={leaveRoom}
        aria-label={t('room.leave')}
        className="px-4 h-12 rounded-xl flex items-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium transition-colors"
      >
        <LogOut size={18} />
        <span className="hidden sm:inline">{t('room.leave')}</span>
      </button>
      
    </div>
  );
}
