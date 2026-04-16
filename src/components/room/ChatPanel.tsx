'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send } from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';
import { useStudyRoom } from '@/hooks/useStudyRoom';

export function ChatPanel() {
  const { t } = useTranslation('common');
  const { chatOpen, toggleChat, messages } = useRoomStore();
  const { sendMessage } = useStudyRoom();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  if (!chatOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col w-full md:w-80 h-full max-h-[500px] bg-card/80 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden shrink-0">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">{t('room.groupChat')}</h3>
        <button 
          onClick={toggleChat}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground mt-4">
            {t('room.noMessages')}
          </p>
        ) : (
            messages.map((msg, idx) => (
              <div 
                key={msg.id || idx} 
                className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
              >
                {!msg.isOwn && (
                  <span className="text-[10px] text-muted-foreground ms-2 mb-1 font-bold uppercase tracking-tight">
                    {msg.fromName}
                  </span>
                )}
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-[1.2rem] text-sm shadow-sm transition-all hover:scale-[1.02] ${
                    msg.isOwn 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-muted/40 backdrop-blur-md text-foreground border border-white/5 rounded-tl-none'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.text}
                </div>
              </div>
            ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('room.chatPlaceholder')}
          maxLength={500}
          className="flex-1 bg-transparent border border-muted-foreground/30 focus:border-primary px-3 py-2 rounded-xl text-sm outline-none transition-colors"
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="flex-none p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-colors"
        >
          <Send size={16} className="rtl:rotate-180" />
        </button>
      </form>
      
    </div>
  );
}
