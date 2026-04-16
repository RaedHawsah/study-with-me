'use client';

import { useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

export function useMediaStream() {
  const { 
    localStream, setLocalStream,
    screenStream, setScreenStream,
    cameraOn, setCameraOn,
    screenOn, setScreenOn 
  } = useRoomStore();

  const stopStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    try {
      if (cameraOn) {
        localStream?.getVideoTracks().forEach(track => {
            track.stop();
            localStream.removeTrack(track);
        });
        
        if (localStream?.getTracks().length === 0) {
            setLocalStream(null);
        }
        setCameraOn(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false // Disabled as requested
        });
        
        if (localStream) {
            const videoTrack = stream.getVideoTracks()[0];
            localStream.addTrack(videoTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
            setLocalStream(stream);
        }
        setCameraOn(true);
      }
    } catch (err) {
      console.error('Failed to toggle camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  }, [cameraOn, localStream, setCameraOn, setLocalStream]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (screenOn) {
        stopStream(screenStream);
        setScreenStream(null);
        setScreenOn(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false // Disabled
        });
        
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setScreenOn(false);
        };

        setScreenStream(stream);
        setScreenOn(true);
      }
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  }, [screenOn, screenStream, setScreenOn, setScreenStream, stopStream]);

  return {
    toggleCamera,
    toggleScreenShare,
    stopAll: () => {
        stopStream(localStream);
        stopStream(screenStream);
    }
  };
}
