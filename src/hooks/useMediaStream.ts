'use client';

import { useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';
import { useLocalParticipant } from '@livekit/components-react';

export function useMediaStream() {
  const { localParticipant } = useLocalParticipant();

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;
    try {
      const isEnabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!isEnabled);
      useRoomStore.getState().setMicOn(!isEnabled);
    } catch (err) {
      console.error('Failed to toggle mic:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [localParticipant]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return;
    try {
      const isEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!isEnabled);
      useRoomStore.getState().setCameraOn(!isEnabled);
    } catch (err) {
      console.error('Failed to toggle camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  }, [localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;
    try {
      const isEnabled = localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(!isEnabled);
      useRoomStore.getState().setScreenOn(!isEnabled);
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  }, [localParticipant]);

  return {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    stopAll: () => {
      // LiveKit handles cleanup on disconnect automatically
    }
  };
}
