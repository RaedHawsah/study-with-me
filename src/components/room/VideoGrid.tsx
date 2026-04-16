import { useRef, useEffect } from 'react';
import { useRoomStore } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { User, Zap, Flame, Coffee, BookOpen, Monitor } from 'lucide-react';

function ParticipantCard({ peer, isMe = false, isScreen = false }: { peer: any, isMe?: boolean, isScreen?: boolean }) {
  const isFocus = peer.status === 'focus';
  const isBreak = peer.status === 'shortBreak' || peer.status === 'longBreak';
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);
  
  return (
    <div className={`
      relative group overflow-hidden rounded-3xl border transition-all duration-500
      aspect-[4/5] flex flex-col p-5 shadow-xl
      ${isMe ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-card/40 backdrop-blur-md border-white/5 hover:border-white/10'}
    `}>
      
      {/* Video Content */}
      {peer.stream && (
        <div className="absolute inset-0 z-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMe}
            className={`w-full h-full object-cover transition-opacity duration-700 ${isScreen ? 'object-contain' : ''}`}
          />
          {/* Overlay for better readability over video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>
      )}

      {/* Background Status Glow (Only show if no video) */}
      {!peer.stream && (
        <div className={`
          absolute -inset-10 opacity-10 blur-3xl transition-opacity duration-1000
          ${isFocus ? 'bg-primary' : isBreak ? 'bg-green-500' : 'bg-muted'}
        `} />
      )}

      {/* Header: Level & Status Icon */}
      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white shadow-inner">
          {isScreen ? <Monitor size={10} className="text-primary" /> : <Zap size={10} className="text-primary" fill="currentColor" />}
          {isScreen ? 'Screen' : `LVL ${peer.level || 1}`}
        </div>
        <div className={`
          p-2 rounded-2xl shadow-lg backdrop-blur-md
          ${isFocus ? 'bg-primary/80 text-primary-foreground animate-pulse' : 
            isBreak ? 'bg-green-500/80 text-white' : 'bg-black/40 text-white'}
        `}>
          {isFocus ? <BookOpen size={18} /> : isBreak ? <Coffee size={18} /> : <User size={18} />}
        </div>
      </div>

      {/* Avatar & Info (Shown if no video) */}
      {!peer.stream && (
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
              absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-card/60
              ${isFocus ? 'bg-primary' : isBreak ? 'bg-green-500' : 'bg-muted'}
            `} />
          </div>
        </div>
      )}

      {/* Participant Info Overlay (if video exists, it's pushed to bottom) */}
      <div className={`mt-auto z-10 transition-transform duration-300 ${peer.stream ? 'translate-y-2 group-hover:translate-y-0' : ''}`}>
        <div className="text-center mb-4">
          <h4 className="font-black text-lg tracking-tight truncate max-w-[140px] text-white drop-shadow-md">
            {peer.name || 'Anonymous'}
            {isMe && <span className="ml-1 opacity-70 text-[10px] uppercase">(You)</span>}
          </h4>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 drop-shadow-md ${isFocus ? 'text-primary-foreground' : isBreak ? 'text-green-400' : 'text-white/60'}`}>
            {isFocus ? 'Focus Mode' : isBreak ? 'On Break' : 'Chilling'}
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
  const { peers, myId, myName, localStream, screenStream } = useRoomStore();
  const { totalXp, currentStreak } = useGamificationStore();
  const timerStatus = useTimerStore(s => s.status);
  const sessionType = useTimerStore(s => s.sessionType);

  const myPeer = {
    id: myId,
    name: myName,
    xp: totalXp,
    level: Math.max(1, Math.floor((totalXp || 0) / 500) + 1),
    streak: currentStreak,
    status: timerStatus === 'running' ? sessionType : 'idle',
    stream: localStream
  };

  const peerList = Object.values(peers);

  return (
    <div className="flex-1 w-full h-full p-4 overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 w-full h-fit max-w-7xl mx-auto">
        <ParticipantCard peer={myPeer} isMe />
        
        {/* If I am screen sharing, show my screen in a card */}
        {screenStream && (
          <ParticipantCard 
            peer={{ ...myPeer, name: `${myName}'s Screen`, stream: screenStream }} 
            isMe 
            isScreen
          />
        )}

        {peerList.map(peer => (
          <div key={peer.id} className="contents">
            <ParticipantCard peer={peer} />
            {peer.screenStream && (
              <ParticipantCard 
                peer={{ ...peer, name: `${peer.name}'s Screen`, stream: peer.screenStream }} 
                isScreen
              />
            )}
          </div>
        ))}
        
        {/* Placeholder slots for empty spots in 6-person rooms */}
        {Array.from({ length: Math.max(0, 5 - peerList.length - (screenStream ? 1 : 0)) }).map((_, i) => (
          <div key={i} className="aspect-[4/5] rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-muted-foreground/10">
            <User size={40} strokeWidth={1} />
          </div>
        ))}
      </div>
    </div>
  );
}
