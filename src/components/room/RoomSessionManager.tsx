'use client';

import { useEffect, useRef } from 'react';
import { useStudyRoom } from '@/hooks/useStudyRoom';
import { useRoomStore } from '@/store/useRoomStore';

/**
 * RoomSessionManager — A persistent, hidden component at the root layout.
 * It hosts the useStudyRoom hook to keep the Supabase/WebRTC session alive
 * during internal navigation.
 */
export function RoomSessionManager() {
  const { joinRoom, createRoom, leaveRoom, sendMessage } = useStudyRoom();

  // Keep latest functions in a ref so we can use them inside stable wrapper functions
  const actionsRef = useRef({ joinRoom, createRoom, leaveRoom, sendMessage });
  actionsRef.current = { joinRoom, createRoom, leaveRoom, sendMessage };

  // 1. Reconnect on mount if we have a persisted session
  useEffect(() => {
    const { status, roomId, myName, roomType, roomCode, myId } = useRoomStore.getState();
    
    if (status === 'joined' && roomId) {
      console.log('[Room] Reconnecting to persistent session:', roomId);
      actionsRef.current.joinRoom(myName, roomType, roomCode || '', myId || undefined);
    } else if (status === 'joining' || status === 'error') {
      // If the user refreshed the page while connecting or in an error state, reset to avoid getting stuck
      useRoomStore.getState().resetRoom();
    }
  }, []); // Only once on app load

  // 2. Inject stable wrapper actions into the store ONLY ONCE to avoid infinite loops
  useEffect(() => {
    useRoomStore.setState({
      actions: {
        joinRoom: (...args) => actionsRef.current.joinRoom(...args),
        createRoom: (...args) => actionsRef.current.createRoom(...args),
        leaveRoom: async () => {
          await actionsRef.current.leaveRoom();
        },
        sendMessage: (...args) => actionsRef.current.sendMessage(...args)
      }
    });
  }, []);

  return null;
}
