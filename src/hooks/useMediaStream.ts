'use client';

import { useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

export function useMediaStream() {
  const { 
    localStream, setLocalStream,
    screenStream, setScreenStream,
    cameraOn, setCameraOn,
    screenOn, setScreenOn,
    micOn, setMicOn
  } = useRoomStore();

  const stopStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  const toggleMic = useCallback(async () => {
    try {
      if (micOn) {
        localStream?.getAudioTracks().forEach(track => {
            track.stop();
            localStream.removeTrack(track);
        });
        
        if (localStream?.getTracks().length === 0) {
            useRoomStore.setState({ localStream: null, micOn: false });
        } else if (localStream) {
            useRoomStore.setState({ 
                localStream: new MediaStream(localStream.getTracks()),
                micOn: false
            });
        } else {
            useRoomStore.setState({ micOn: false });
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: false 
        });
        
        if (localStream) {
            const audioTrack = stream.getAudioTracks()[0];
            localStream.addTrack(audioTrack);
            useRoomStore.setState({ 
                localStream: new MediaStream(localStream.getTracks()),
                micOn: true
            });
        } else {
            useRoomStore.setState({ localStream: stream, micOn: true });
        }
      }
    } catch (err) {
      console.error('Failed to toggle mic:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [micOn, localStream, setMicOn, setLocalStream]);

  const toggleCamera = useCallback(async () => {
    try {
      if (cameraOn) {
        localStream?.getVideoTracks().forEach(track => {
            track.stop();
            localStream.removeTrack(track);
        });
        
        if (localStream?.getTracks().length === 0) {
            useRoomStore.setState({ localStream: null, cameraOn: false });
        } else if (localStream) {
            useRoomStore.setState({ 
                localStream: new MediaStream(localStream.getTracks()),
                cameraOn: false
            });
        } else {
            useRoomStore.setState({ cameraOn: false });
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false // We use toggleMic for audio independently
        });
        
        if (localStream) {
            const videoTrack = stream.getVideoTracks()[0];
            localStream.addTrack(videoTrack);
            useRoomStore.setState({ 
                localStream: new MediaStream(localStream.getTracks()),
                cameraOn: true
            });
        } else {
            useRoomStore.setState({ localStream: stream, cameraOn: true });
        }
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
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    stopAll: () => {
        stopStream(localStream);
        stopStream(screenStream);
    }
  };
}
