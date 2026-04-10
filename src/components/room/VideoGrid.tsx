'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, VideoOff } from 'lucide-react';
import { useRoomStore } from '@/store/useRoomStore';

// ─── Reusable Video Element ───────────────────────────────────────────────────

function VideoPlayer({ stream, name, isLocal = false }: { stream: MediaStream | null, name: string, isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = !!stream && stream.getVideoTracks().length > 0;

  return (
    <div className="relative w-full aspect-video bg-sidebar rounded-2xl overflow-hidden border border-border shadow-sm flex items-center justify-center">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // ALWAYS muted. The server never relays audio anyway, but this is a double lock.
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
          {isLocal ? <VideoOff size={32} opacity={0.5} /> : <User size={32} opacity={0.5} />}
        </div>
      )}
      
      {/* Name plate */}
      <div className="absolute bottom-2 start-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-medium text-white shadow-sm border border-white/10 z-10 max-w-[90%] truncate">
        {name} {isLocal && '(You)'}
      </div>
    </div>
  );
}

// ─── Grid Component ──────────────────────────────────────────────────────────

export function VideoGrid() {
  const { localStream, screenStream, peers, myName } = useRoomStore();
  const { t } = useTranslation('common');

  const peerList = Object.values(peers);

  return (
    <div className="flex-1 w-full flex align-start justify-center h-full p-4 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full h-fit max-w-6xl content-start">
        
        {/* Local Camera */}
        <VideoPlayer stream={localStream} name={myName || 'You'} isLocal />
        
        {/* Local Screen Share */}
        {screenStream && (
          <VideoPlayer stream={screenStream} name={`${myName} - Screen`} />
        )}

        {/* Remote Peers */}
        {peerList.map((peer) => (
          <VideoPlayer key={peer.id} stream={peer.stream} name={peer.name} />
        ))}
        
        {/* Empty slots visual hint */}
        {peerList.length === 0 && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border mt-10">
            <User size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {t('room.waiting')}
            </h3>
            <p className="text-sm max-w-sm">
              {t('room.waitingDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
