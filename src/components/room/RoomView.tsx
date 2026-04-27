'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Loader2 } from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useStudyRoom } from '@/hooks/useStudyRoom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { VideoGrid } from './VideoGrid';
import { RoomControls } from './RoomControls';
import { ChatPanel } from './ChatPanel';

export function RoomView() {
  const { t, i18n } = useTranslation('common');
  const { status, errorMessage, chatOpen, setError, actions } = useRoomStore();
  const { user } = useSupabaseAuth();

  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState<'random' | 'private'>('random');
  const [privateMode, setPrivateMode] = useState<'join' | 'create'>('join');
  const [code, setCode] = useState('');

  const handleAction = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || !actions) return;

    if (roomType === 'random') {
      actions.joinRoom(name.trim(), 'random', '', user?.id);
    } else {
      if (privateMode === 'join') {
        actions.joinRoom(name.trim(), 'private', code, user?.id);
      } else {
        actions.createRoom(name.trim(), user?.id || crypto.randomUUID());
      }
    }
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
          <p className="text-muted-foreground mb-8 text-sm">
            {t('room.description')}
          </p>

          {status === 'error' && errorMessage && (
            <div className="w-full flex flex-col gap-3 mb-6">
              <div className="w-full p-3 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleAction} className="w-full flex flex-col gap-6">
            <div className="flex flex-col text-start gap-5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label htmlFor="join-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ms-1">
                  {t('room.nameLabel', 'Your Display Name')}
                </label>
                <input
                  id="join-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (status === 'error') setError('');
                  }}
                  placeholder={t('room.namePlaceholder', 'e.g. Abdullah')}
                  maxLength={20}
                  className="w-full bg-background/50 border border-border focus:border-primary px-5 py-3.5 rounded-2xl outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                  autoFocus
                />
              </div>

              {/* Room Type Selector */}
              <div className="flex p-1 bg-background/40 border border-border rounded-2xl">
                <button
                  type="button"
                  onClick={() => setRoomType('random')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    roomType === 'random' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  {i18n.language === 'ar' ? 'مجموعة عشوائية' : 'Random Group'}
                </button>
                <button
                  type="button"
                  onClick={() => setRoomType('private')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    roomType === 'private' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  {i18n.language === 'ar' ? 'غرفة خاصة' : 'Private Room'}
                </button>
              </div>

              {/* Private Mode Sub-Selector */}
              {roomType === 'private' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setPrivateMode('join')}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                        privateMode === 'join' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {t('room.joinExisting')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivateMode('create')}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                        privateMode === 'create' ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {t('room.createNew')}
                    </button>
                  </div>

                  {privateMode === 'join' && (
                    <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                      <label htmlFor="room-code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ms-1">
                        {t('room.codeLabel', 'Room Code')}
                      </label>
                      <input
                        id="room-code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={t('room.codePlaceholder', 'Enter Code (e.g. a1b2c3d4)')}
                        className="w-full bg-background/50 border border-border focus:border-primary px-5 py-3.5 rounded-2xl outline-none transition-all font-mono text-center"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  )}
                  
                  {privateMode === 'create' && (
                    <p className="text-center text-[11px] text-muted-foreground px-4">
                      {t('room.createPrompt')}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!name.trim() || (roomType === 'private' && privateMode === 'join' && !code.trim())}
              className="w-full py-4 rounded-2xl font-bold bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 active:scale-95 text-sm"
            >
              {roomType === 'random' 
                ? (t('room.findGroup', 'Find a Group')) 
                : privateMode === 'join'
                  ? (t('room.joinPrivate', 'Join Private Room'))
                  : (t('room.createButton'))}
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
