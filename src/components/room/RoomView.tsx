'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Loader2 } from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useStudyRoom } from '@/hooks/useStudyRoom';
import { VideoGrid } from './VideoGrid';
import { RoomControls } from './RoomControls';
import { ChatPanel } from './ChatPanel';

export function RoomView() {
  const { t } = useTranslation('common');
  const { status, errorMessage, chatOpen } = useRoomStore();
  const { joinRoom, leaveRoom } = useStudyRoom();
  const leaveRoomRef = useRef(leaveRoom);
  leaveRoomRef.current = leaveRoom;

  // Only the top-level RoomView cleans up the room when destroyed
  useEffect(() => {
    return () => leaveRoomRef.current();
  }, []);

  const [name, setName] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) joinRoom(name.trim());
  };

  // ─── JOIN SCREEN ───────────────────────────────────────────────────────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 w-full">
        <div className="max-w-md w-full bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
          
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Users size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('room.title')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('room.description')}
          </p>

          {status === 'error' && errorMessage && (
            <div className="w-full p-3 mb-6 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleJoin} className="w-full flex flex-col gap-4">
            <div className="flex flex-col text-start">
              <label htmlFor="join-name" className="text-sm font-medium mb-1.5 ms-1 text-foreground">
                {t('room.nameLabel')}
              </label>
              <input
                id="join-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('room.namePlaceholder')}
                maxLength={32}
                className="w-full bg-background border border-border focus:border-primary px-4 py-3 rounded-xl outline-none transition-colors"
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary-hover transition-colors shadow-md mt-2"
            >
              {t('room.joinBtn')}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // ─── CONNECTING SCREEN ─────────────────────────────────────────────────────
  if (status === 'joining') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 size={48} className="animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-foreground">{t('room.connecting')}</p>
      </div>
    );
  }

  // ─── ACTIVE ROOM SCREEN ────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-80px)] w-full overflow-hidden">
      
      {/* Main content area: Grid + Chat side-by-side */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden mb-4">
        
        {/* Video Grid (takes remaining space) */}
        <div className="flex-1 relative overflow-hidden rounded-3xl pb-16 md:pb-0">
          <VideoGrid />
        </div>

        {/* Floating/Docked Chat Panel */}
        <div 
          className={`
            absolute inset-x-4 bottom-24 top-4 md:static md:bottom-auto md:top-auto
            md:h-full z-40 transition-all duration-300 ease-in-out
            ${chatOpen 
              ? 'opacity-100 translate-y-0 pointer-events-auto' 
              : 'opacity-0 translate-y-8 md:translate-y-0 md:translate-x-8 pointer-events-none w-0 h-0'}
          `}
        >
          <ChatPanel />
        </div>
      </div>

      {/* Absolute positioned control bar at the bottom */}
      <div className="absolute bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto shadow-2xl rounded-3xl">
          <RoomControls />
        </div>
      </div>
      
    </div>
  );
}
