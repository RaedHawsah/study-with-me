import { useRef, useEffect, useState } from 'react';
import { useRoomStore } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { User, Zap, Flame, Coffee, BookOpen, Monitor, Maximize2, Clock } from 'lucide-react';
import { useParticipants, useLocalParticipant, VideoTrack, AudioTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

function ParticipantCard({ peer, isMe = false, isScreen = false }: { peer: any, isMe?: boolean, isScreen?: boolean }) {
  const isFocus = peer.status === 'focus';
  const isBreak = peer.status === 'shortBreak' || peer.status === 'longBreak';
  const isPaused = peer.timerStatus === 'paused';
  const [displaySeconds, setDisplaySeconds] = useState(peer.remainingSeconds || 0);
  const containerRef = useRef<HTMLDivElement>(null);

  const participant = peer.participant;
  
  // Check if track is published and enabled
  const hasVideo = isScreen 
    ? participant?.isScreenShareEnabled 
    : participant?.isCameraEnabled;

  const { roomType, timerSync, leaderId } = useRoomStore();

  // Timer Countdown Logic
  useEffect(() => {
    let initialSeconds = peer.remainingSeconds || 0;
    
    // Adjust for time elapsed since the last update
    if (peer.timerStatus === 'running' && peer.timerLastUpdated) {
      const elapsed = Math.floor((Date.now() - peer.timerLastUpdated) / 1000);
      initialSeconds = Math.max(0, initialSeconds - elapsed);
    }
    
    setDisplaySeconds(initialSeconds);

    if (peer.timerStatus === 'running') {
      const interval = setInterval(() => {
        setDisplaySeconds((prev: number) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [peer.timerStatus, peer.remainingSeconds, peer.timerLastUpdated]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    }
  };
  
  return (
    <div ref={containerRef} className={`
      relative group overflow-hidden rounded-3xl border transition-all duration-500
      aspect-[4/5] flex flex-col p-5 shadow-xl
      ${isMe ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-card/40 backdrop-blur-md border-white/5 hover:border-white/10'}
    `}>
      
      {/* Video Content via LiveKit */}
      {hasVideo && participant && (
        <div className="absolute inset-0 z-0 bg-black">
          <VideoTrack
            participant={participant}
            source={isScreen ? Track.Source.ScreenShare : Track.Source.Camera}
            className={`w-full h-full object-cover transition-opacity duration-700 ${isScreen ? 'object-contain' : ''}`}
          />
          {/* Audio stream for remote peers */}
          {!isMe && !isScreen && (
             <AudioTrack participant={participant} source={Track.Source.Microphone} />
          )}
          {/* Overlay for better readability over video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>
      )}

      {/* Fallback Audio stream for remote peers without video */}
      {!hasVideo && !isMe && !isScreen && participant && participant.isMicrophoneEnabled && (
         <div className="hidden"><AudioTrack participant={participant} source={Track.Source.Microphone} /></div>
      )}

      {/* Background Status Glow (Only show if no video) */}
      {!hasVideo && (
        <div className={`
          absolute -inset-10 opacity-10 blur-3xl transition-opacity duration-1000
          ${isPaused ? 'bg-yellow-500' : (isFocus ? 'bg-primary' : isBreak ? 'bg-green-500' : 'bg-muted')}
        `} />
      )}

      {/* Fullscreen Button - Only shows when video exists and on hover */}
      {hasVideo && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={handleFullscreen}
            className="p-3 rounded-2xl bg-black/60 hover:bg-primary backdrop-blur-xl border border-white/20 text-white transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-2xl flex items-center gap-2"
          >
            <Maximize2 size={18} />
            {isScreen && <span className="text-xs font-bold uppercase tracking-tight">Full Screen</span>}
          </button>
        </div>
      )}

      {/* Header: Level & Status Icon */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white shadow-inner w-fit">
            {isScreen ? <Monitor size={12} className="text-primary" /> : <Zap size={12} className="text-primary" fill="currentColor" />}
            {isScreen ? 'Screen Share' : `LVL ${peer.level || 1}`}
          </div>
          
          {/* Real-time Timer Badge */}
          {(peer.timerStatus === 'running' || isPaused) && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[12px] font-black font-mono shadow-lg animate-in fade-in zoom-in duration-300 ${
              isPaused
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500'
                : 'bg-primary/20 border-primary/30 text-primary'
            }`}>
              {isPaused ? (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shrink-0" />
              ) : (
                <Clock size={12} className="animate-pulse" />
              )}
              {formatTime(displaySeconds)}
            </div>
          )}
        </div>

        <div className={`
          p-2 rounded-2xl shadow-lg backdrop-blur-md transition-colors duration-300
          ${isPaused ? 'bg-yellow-500/80 text-white' :
            isFocus ? 'bg-primary/80 text-primary-foreground animate-pulse' : 
            isBreak ? 'bg-green-500/80 text-white' : 'bg-black/40 text-white'}
        `}>
          {isFocus ? <BookOpen size={18} /> : isBreak ? <Coffee size={18} /> : <User size={18} />}
        </div>
      </div>

      {/* Avatar & Info (Shown if no video) */}
      {!hasVideo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 z-10 pt-4">
          <div className={`
            relative w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black shadow-2xl transition-transform duration-500 group-hover:scale-110
            ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground'}
          `}>
            {peer.avatar_url ? (
              <img src={peer.avatar_url} className="w-full h-full object-cover rounded-full" />
            ) : (
              peer.name?.charAt(0) || '?'
            )}
            {/* Status Indicator Dot */}
            <div className={`
              absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-card/60 transition-colors duration-300
              ${isPaused ? 'bg-yellow-500' : (isFocus ? 'bg-primary' : isBreak ? 'bg-green-500' : 'bg-muted')}
            `} />
          </div>
        </div>
      )}

      {/* Participant Info Overlay (if video exists, it's pushed to bottom) */}
      <div className={`mt-auto z-10 transition-transform duration-300 ${hasVideo ? 'translate-y-2 group-hover:translate-y-0' : ''}`}>
        <div className="text-center mb-4">
          <h4 className="font-black text-lg tracking-tight truncate max-w-[140px] text-white drop-shadow-md mx-auto">
            {peer.name || 'Anonymous'}
            {isMe && <span className="ml-1 opacity-70 text-[10px] uppercase">(You)</span>}
          </h4>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 drop-shadow-md transition-colors duration-300 ${
            isPaused ? 'text-yellow-400' : (isFocus ? 'text-primary-foreground' : isBreak ? 'text-green-400' : 'text-white/60')
          }`}>
            {isPaused 
              ? (isFocus ? 'Focus (Paused)' : 'On Break (Paused)') 
              : (isFocus ? 'Focus Mode' : isBreak ? 'On Break' : 'Chilling')}
          </p>
        </div>

        {/* Footer Stats */}
        <div className="flex justify-around items-center pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-[7px] font-bold text-white/50 uppercase leading-none mb-1">XP</p>
            <p className="font-mono font-black text-xs text-white">{peer.xp || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[7px] font-bold text-white/50 uppercase leading-none mb-1">Streak</p>
            <div className="flex items-center gap-1 justify-center">
              <Flame size={10} className="text-orange-500" fill="currentColor" />
              <p className="font-mono font-black text-xs text-white">{peer.streak || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoGrid() {
  const { peers, myId, myName } = useRoomStore();
  const { totalXp, currentStreak } = useGamificationStore();
  const timerStore = useTimerStore();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const getParticipant = (id: string) => participants.find(p => p.identity === id) || (localParticipant.identity === id ? localParticipant : null);

  const myPeer = {
    id: myId,
    name: myName,
    xp: totalXp,
    level: Math.max(1, Math.floor((totalXp || 0) / 500) + 1),
    streak: currentStreak,
    status: timerStore.status === 'idle' ? 'idle' : timerStore.sessionType,
    timerStatus: timerStore.status,
    remainingSeconds: timerStore.remainingSeconds,
    timerLastUpdated: timerStore.lastUpdatedAt,
    participant: localParticipant
  };

  const peerList = Object.values(peers).map(peer => ({
    ...peer,
    participant: getParticipant(peer.id)
  }));

  return (
    <div className="flex-1 w-full h-full p-4 overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 w-full h-fit max-w-7xl mx-auto">
        <ParticipantCard peer={myPeer} isMe />
        
        {/* If I am screen sharing, show my screen in a card */}
        {localParticipant.isScreenShareEnabled && (
          <ParticipantCard 
            peer={{ ...myPeer, name: `${myName}'s Screen` }} 
            isMe 
            isScreen
          />
        )}

        {peerList.map(peer => (
          <div key={peer.id} className="contents">
            <ParticipantCard peer={peer} />
            {peer.participant?.isScreenShareEnabled && (
              <ParticipantCard 
                peer={{ ...peer, name: `${peer.name}'s Screen` }} 
                isScreen
              />
            )}
          </div>
        ))}
        
        {/* Placeholder slots for empty spots in 6-person rooms */}
        {Array.from({ length: Math.max(0, 5 - peerList.length - (localParticipant.isScreenShareEnabled ? 1 : 0)) }).map((_, i) => (
          <div key={`placeholder-${i}`} className="aspect-[4/5] rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-muted-foreground/10">
            <User size={40} strokeWidth={1} />
          </div>
        ))}
      </div>
    </div>
  );
}
