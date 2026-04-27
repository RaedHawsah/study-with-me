'use client';

import { useEffect } from 'react';
import { useStudyRoom } from '@/hooks/useStudyRoom';
import { useRoomStore } from '@/store/useRoomStore';

/**
 * RoomSessionManager — A persistent, hidden component at the root layout.
 * It hosts the useStudyRoom hook to keep the Supabase/WebRTC session alive
 * during internal navigation.
 */
export function RoomSessionManager() {
  const { joinRoom, createRoom, leaveRoom, sendMessage } = useStudyRoom();

  // 1. Reconnect on mount if we have a persisted session
  useEffect(() => {
    const { status, roomId, myName, roomType, roomCode, myId } = useRoomStore.getState();
    
    if (status === 'joined' && roomId) {
      console.log('[Room] Reconnecting to persistent session:', roomId);
      joinRoom(myName, roomType, roomCode || '', myId || undefined);
    }
  }, []); // Only once on app load

  // 2. Inject actions into the store
  useEffect(() => {
    useRoomStore.setState({
      actions: {
        joinRoom,
        createRoom,
        leaveRoom: async () => {
          await leaveRoom();
        },
        sendMessage
      }
    });
  }, [joinRoom, createRoom, leaveRoom, sendMessage]);

  return null;
}
