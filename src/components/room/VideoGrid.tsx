import { useRef, useEffect, useState } from 'react';
import { useRoomStore } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { useGamificationStore, getLevelFromXp } from '@/store/useGamificationStore';
import { User, Zap, Flame, Coffee, BookOpen, Monitor, Maximize2, Clock } from 'lucide-react';
import { useParticipants, useLocalParticipant, useRemoteParticipant, VideoTrack, AudioTrack, useParticipantTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

function ParticipantCard({ peer, isMe = false, isScreen = false }: { peer: any, isMe?: boolean, isScreen?: boolean }) {
  const { t } = useTranslation('common');
  // Read self timer state to prevent parent from re-rendering every second
  const myTimerStatus = useTimerStore(state => state.status);
  const myRemainingSeconds = useTimerStore(state => state.remainingSeconds);
  const myLastUpdatedAt = useTimerStore(state => state.lastUpdatedAt);
  const mySessionType = useTimerStore(state => state.sessionType);

  const isFocus = isMe ? (myTimerStatus === 'idle' ? false : mySessionType === 'focus') : peer.status === 'focus';
  const isBreak = isMe ? (myTimerStatus !== 'idle' && mySessionType !== 'focus') : (peer.status === 'shortBreak' || peer.status === 'longBreak');
  const isPaused = isMe ? myTimerStatus === 'paused' : peer.timerStatus === 'paused';
  const currentTimerStatus = isMe ? myTimerStatus : peer.timerStatus;
  const currentRemainingSeconds = isMe ? myRemainingSeconds : peer.remainingSeconds;
  const currentLastUpdated = isMe ? myLastUpdatedAt : peer.timerLastUpdated;

  const [displaySeconds, setDisplaySeconds] = useState(currentRemainingSeconds || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant();
  const remoteParticipant = useRemoteParticipant(peer.id);
  
  const participant = isMe ? localParticipant : remoteParticipant;
  
  const hasCamera = isMe ? isCameraEnabled : remoteParticipant?.isCameraEnabled;
  const hasScreen = isMe ? isScreenShareEnabled : remoteParticipant?.isScreenShareEnabled;
  const hasMic = isMe ? isMicrophoneEnabled : remoteParticipant?.isMicrophoneEnabled;

  // Get trackRefs for the v2 API - pass identity string, not participant object
  const localTracks = useParticipantTracks(
    [Track.Source.Camera, Track.Source.ScreenShare, Track.Source.Microphone],
    localParticipant?.identity
  );
  const remoteTracks = useParticipantTracks(
    [Track.Source.Camera, Track.Source.ScreenShare, Track.Source.Microphone],
    remoteParticipant?.identity
  );
  const tracks = isMe ? localTracks : remoteTracks;

  const videoSource = isScreen ? Track.Source.ScreenShare : Track.Source.Camera;
  const videoTrackRef = tracks.find(t => t.source === videoSource);
  const audioTrackRef = tracks.find(t => t.source === Track.Source.Microphone);

  const hasVideo = isScreen ? hasScreen : hasCamera;

  useEffect(() => {
    let initialSeconds = currentRemainingSeconds || 0;
    
    if (currentTimerStatus === 'running' && currentLastUpdated) {
      const elapsed = Math.floor((Date.now() - currentLastUpdated) / 1000);
      initialSeconds = Math.max(0, initialSeconds - elapsed);
    }
    
    setDisplaySeconds(initialSeconds);

    if (currentTimerStatus === 'running') {
      const interval = setInterval(() => {
        setDisplaySeconds((prev: number) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentTimerStatus, currentRemainingSeconds, currentLastUpdated]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen();
        }
      }
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={`
      w-full relative group overflow-hidden transition-all duration-500
      flex flex-col shadow-xl
      ${isFullscreen ? 'aspect-auto h-screen rounded-none border-none p-6 md:p-10 z-[100]' : 'aspect-[3/4] sm:aspect-square md:aspect-[4/3] rounded-3xl border p-3 md:p-4'}
      ${isMe ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-card/40 backdrop-blur-md border-white/5 hover:border-white/10'}
      ${isScreen && !hasVideo ? 'hidden' : ''}
    `}>
      
      {hasVideo && videoTrackRef && (
        <div className="absolute inset-0 z-0 bg-black">
          <VideoTrack
            trackRef={videoTrackRef}
            className={`w-full h-full object-cover transition-opacity duration-700 ${isScreen ? 'object-contain' : ''}`}
          />
          {!isMe && !isScreen && audioTrackRef && (
             <AudioTrack trackRef={audioTrackRef} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>
      )}

      {!hasVideo && !isMe && !isScreen && audioTrackRef && hasMic && (
         <div className="hidden"><AudioTrack trackRef={audioTrackRef} /></div>
      )}

      {!hasVideo && (
        <div className={`
          absolute -inset-10 opacity-10 blur-3xl transition-opacity duration-1000
          ${isPaused ? 'bg-yellow-500' : (isFocus ? 'bg-primary' : isBreak ? 'bg-green-500' : 'bg-muted')}
        `} />
      )}

      {hasVideo && (
        <div className="absolute top-2 end-2 md:top-4 md:end-4 z-20 flex gap-1.5 md:gap-2">
          <button
            onClick={handleFullscreen}
            className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-black/40 hover:bg-primary backdrop-blur-xl border border-white/20 text-white transition-all duration-300 shadow-xl flex items-center gap-1.5 md:gap-2"
          >
            <Maximize2 size={16} className="md:w-[18px] md:h-[18px]" />
            {isScreen && <span className="text-[10px] md:text-xs font-bold uppercase tracking-tight">{t('room.fullScreen', { defaultValue: 'Full Screen' })}</span>}
          </button>
        </div>
      )}

      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white shadow-inner w-fit">
            {isScreen ? <Monitor size={12} className="text-primary" /> : <Zap size={12} className="text-primary" fill="currentColor" />}
            {isScreen ? t('room.screenShare', { defaultValue: 'Screen Share' }) : `${t('gami.level', { defaultValue: 'LVL' })} ${peer.level || 1}`}
          </div>
          
          {(currentTimerStatus === 'running' || isPaused) && (
            <div className={`flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1 rounded-xl border text-[10px] md:text-[12px] font-black font-mono shadow-lg animate-in fade-in zoom-in duration-300 ${
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
          p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-lg backdrop-blur-md transition-colors duration-300
          ${isPaused ? 'bg-yellow-500/80 text-white' :
            isFocus ? 'bg-primary/80 text-primary-foreground animate-pulse' : 
            isBreak ? 'bg-green-500/80 text-white' : 'bg-black/40 text-white'}
        `}>
          {isFocus ? <BookOpen size={16} className="md:w-[18px] md:h-[18px]" /> : isBreak ? <Coffee size={16} className="md:w-[18px] md:h-[18px]" /> : <User size={16} className="md:w-[18px] md:h-[18px]" />}
        </div>
      </div>

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-0">
          <div className={`
            relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-black shadow-2xl transition-transform duration-500 group-hover:scale-110 pointer-events-auto
            ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground'}
          `}>
            {peer.avatar_url ? (
              <img src={peer.avatar_url} className="w-full h-full object-cover rounded-full" />
            ) : (
              peer.name?.charAt(0) || '?'
            )}
            <div className={`
              absolute bottom-1 end-1 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-card/60 transition-colors duration-300
              ${isPaused ? 'bg-yellow-500' : (isFocus ? 'bg-primary' : isBreak ? 'bg-green-500' : 'bg-muted')}
            `} />
          </div>
        </div>
      )}

      <div className={`mt-auto z-10 transition-transform duration-300 ${hasVideo ? 'translate-y-1 group-hover:translate-y-0' : ''}`}>
        <div className="text-center mb-2 md:mb-4">
          <h4 className="font-black text-sm md:text-lg tracking-tight truncate w-[90%] text-white drop-shadow-md mx-auto">
            {peer.name || 'Anonymous'}
            {isMe && <span className="ms-1 opacity-70 text-[8px] md:text-[10px] uppercase">{t('room.you', { defaultValue: '(You)' })}</span>}
          </h4>
          <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 drop-shadow-md transition-colors duration-300 ${
            isPaused ? 'text-yellow-400' : (isFocus ? 'text-primary-foreground' : isBreak ? 'text-green-400' : 'text-white/60')
          }`}>
            {isPaused 
              ? (isFocus ? `${t('room.focusMode', { defaultValue: 'Focus Mode' })} (Paused)` : `${t('room.onBreak', { defaultValue: 'On Break' })} (Paused)`) 
              : (isFocus ? t('room.focusMode', { defaultValue: 'Focus Mode' }) : isBreak ? t('room.onBreak', { defaultValue: 'On Break' }) : t('room.chilling', { defaultValue: 'Chilling' }))}
          </p>
        </div>

        <div className="flex justify-around items-center pt-2 md:pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-[6px] md:text-[7px] font-bold text-white/50 uppercase leading-none mb-1">XP</p>
            <p className="font-mono font-black text-[10px] md:text-xs text-white">{peer.xp || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[6px] md:text-[7px] font-bold text-white/50 uppercase leading-none mb-1">{t('gami.streak', { defaultValue: 'Streak' })}</p>
            <div className="flex items-center gap-1 justify-center">
              <Flame size={10} className="text-orange-500" fill="currentColor" />
              <p className="font-mono font-black text-[10px] md:text-xs text-white">{peer.streak || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoGrid() {
  const { peers, myId, myName } = useRoomStore(
    useShallow(state => ({
      peers: state.peers,
      myId: state.myId,
      myName: state.myName
    }))
  );
  
  const { totalXp, currentStreak } = useGamificationStore(
    useShallow(state => ({
      totalXp: state.totalXp,
      currentStreak: state.currentStreak
    }))
  );

  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const getParticipant = (id: string) => participants.find(p => p.identity === id) || (localParticipant.identity === id ? localParticipant : null);

  const myPeer = {
    id: myId,
    name: myName,
    xp: totalXp,
    level: getLevelFromXp(totalXp || 0),
    streak: currentStreak,
    participant: localParticipant
  };

  const peerList = Object.values(peers).map(peer => ({
    ...peer,
    participant: getParticipant(peer.id)
  }));

  return (
    <div className="flex-1 w-full h-full p-2 md:p-4 overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full min-h-full content-center max-w-7xl mx-auto">
        <ParticipantCard peer={myPeer} isMe />
        
        <ParticipantCard 
          peer={{ ...myPeer, name: `${myName}'s Screen` }} 
          isMe 
          isScreen
        />

        {peerList.map(peer => (
          <div key={peer.id} className="contents">
            <ParticipantCard peer={peer} />
            <ParticipantCard 
              peer={{ ...peer, name: `${peer.name}'s Screen` }} 
              isScreen
            />
          </div>
        ))}
        
        {Array.from({ length: Math.max(0, 5 - peerList.length - (localParticipant.isScreenShareEnabled ? 1 : 0)) }).map((_, i) => (
          <div key={`placeholder-${i}`} className="w-full aspect-[3/4] sm:aspect-square md:aspect-[4/3] rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-muted-foreground/10">
            <User size={40} strokeWidth={1} />
          </div>
        ))}
      </div>
    </div>
  );
}
