'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import { useRoomStore, type RoomPeer } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { syncFollowerTimer } from './usePomodoro';
import { useGamificationStore, getLevelFromXp } from '@/store/useGamificationStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useStudyRoom() {
  const supabase = createSupabaseClient();
  const {
    setStatus, setRoomId, setRoomCode, setMyId, setMyName, 
    addPeer, removePeer, addMessage, setError, resetRoom, 
    status, roomId, peers, setLeaderId,
    localStream, screenStream, cameraOn, screenOn, timerSync
  } = useRoomStore();
  
  const timerStore = useTimerStore();
  const { totalXp, currentStreak } = useGamificationStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Reconnect state
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalLeaveRef = useRef(false);
  const lastJoinParamsRef = useRef<{ name: string; type: 'random' | 'private'; code?: string; userId?: string } | null>(null);

  useEffect(() => {
    // Cleanup on unmount (e.g. Fast Refresh, Strict Mode)
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(console.error);
        channelRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(console.error);
        channelRef.current = null;
      }
    };
  }, [supabase]);

  const syncPresenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncPresence = useCallback(() => {
    if (!channelRef.current) return;
    
    if (syncPresenceTimeoutRef.current) clearTimeout(syncPresenceTimeoutRef.current);
    
    syncPresenceTimeoutRef.current = setTimeout(() => {
      const timer = useTimerStore.getState();
      const roomStore = useRoomStore.getState();
      const myLevel = getLevelFromXp(totalXp || 0);
      
      channelRef.current?.track({
        id: roomStore.myId,
        name: roomStore.myName,
        xp: totalXp || 0,
        level: myLevel,
        streak: currentStreak || 0,
        status: timer.status === 'idle' ? 'idle' : timer.sessionType,
        timerStatus: timer.status,
        remainingSeconds: timer.remainingSeconds,
        sessionType: timer.sessionType,
        timerLastUpdated: Date.now(),
        cameraOn: roomStore.cameraOn,
        screenOn: roomStore.screenOn,
        micOn: roomStore.micOn,
        cameraStreamId: roomStore.localStream?.id || null,
        screenStreamId: roomStore.screenStream?.id || null,
        countryCode: roomStore.countryCode || 'SA',
        last_updated: new Date().toISOString()
      });
    }, 50);
  }, [totalXp, currentStreak]);




  // Debounce and periodically broadcast peer timer state
  const peerUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    syncPresence();

    const sendUpdate = () => {
      if (channelRef.current) {
        const timer = useTimerStore.getState();
        const roomStore = useRoomStore.getState();
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer_timer_update',
          payload: {
            id: roomStore.myId,
            timerStatus: timer.status,
            status: timer.status === 'idle' ? 'idle' : timer.sessionType,
            remainingSeconds: timer.remainingSeconds,
            timerLastUpdated: Date.now()
          }
        });
      }
    };

    if (peerUpdateTimeoutRef.current) clearTimeout(peerUpdateTimeoutRef.current);
    peerUpdateTimeoutRef.current = setTimeout(sendUpdate, 50);

    const interval = setInterval(sendUpdate, 10000);
    return () => clearInterval(interval);
  }, [timerStore.status, timerStore.sessionType, syncPresence]);

  // Broadcast Timer State (Only if Leader & Sync is ON)
  useEffect(() => {
    const roomStore = useRoomStore.getState();

    if (
      channelRef.current && 
      roomStore.roomType === 'private' && 
      roomStore.myId === roomStore.leaderId && 
      timerSync
    ) {
      const sendSync = () => {
        const currentTimer = useTimerStore.getState();
        channelRef.current?.send({
          type: 'broadcast',
          event: 'timer_sync',
          payload: {
            action: 'sync',
            status: currentTimer.status,
            sessionType: currentTimer.sessionType,
            remainingSeconds: currentTimer.remainingSeconds,
            totalSeconds: currentTimer.totalSeconds,
            timestamp: Date.now()
          }
        });
      };

      // Sync instantly on status/type changes
      sendSync();

      // Frequent sync every 2 seconds for active ticking drift correction
      const interval = setInterval(sendSync, 2000);
      return () => clearInterval(interval);
    }
  }, [timerStore.status, timerStore.sessionType, timerSync]);

  const joinRoom = useCallback(async (name: string, type: 'random' | 'private', code?: string, userId?: string, retryCount = 1) => {
    // Clear any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    intentionalLeaveRef.current = false;
    try {
      if (retryCount > 20) {
        setError('All global rooms are full. Please try again later.');
        setStatus('error');
        return;
      }

      // Ensure any existing channel is removed before joining a new one
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const isReconnect = reconnectAttemptsRef.current > 0;

      if (retryCount === 1 && !isReconnect) {
        resetRoom();
        setStatus('joining');
        setMyName(name);
        lastJoinParamsRef.current = { name, type, code, userId };
      }

      let myId = userId;
      if (!myId) {
        const { data: { user } } = await supabase.auth.getUser();
        myId = user?.id || crypto.randomUUID();
      }
      setMyId(myId as string);

      let targetRoomId = '';
      let targetCode = (code || '').trim().toUpperCase();

      // If it's a reconnect, ALWAYS reuse the exact same room ID we were already in!
      if (isReconnect && useRoomStore.getState().roomId) {
        targetRoomId = useRoomStore.getState().roomId!;
        targetCode = useRoomStore.getState().roomCode || '';
      } else {
        // Fresh Join Logic
        if (type === 'random') {
          targetRoomId = `global-random-${retryCount}`;
          setLeaderId(null);
          
          const { data: existing } = await supabase.from('rooms').select('id').eq('id', targetRoomId).single();
          if (!existing) {
            await supabase.from('rooms').insert({
              id: targetRoomId,
              name: `Global Room ${retryCount}`,
              room_type: 'random',
              created_at: new Date().toISOString()
            });
          }
        } else {
          const { data: roomData, error: roomError } = await supabase.from('rooms').select('*').eq('code', targetCode).single();
          if (roomError || !roomData) {
            setError('Room not found.');
            setStatus('error');
            return;
          }
          targetRoomId = roomData.id;
          setLeaderId(roomData.leader_id);
        }
      }

      setRoomId(targetRoomId);
      setRoomCode(targetCode);
      useRoomStore.getState().setRoomType(type);
      
      // Fetch LiveKit Token
      try {
        const res = await fetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: targetRoomId, username: name, userId: myId })
        });
        const data = await res.json();
        if (data.token) {
          useRoomStore.getState().setLiveKitToken(data.token);
        } else {
          console.error('Failed to get LiveKit token:', data.error);
        }
      } catch (e) {
        console.error('Failed to fetch LiveKit token:', e);
      }

      // Clear peers immediately ONLY if it's a fresh join to a new room
      if (!isReconnect) {
        useRoomStore.setState({ peers: {} });
      }

      const channel = supabase.channel(`room:${targetRoomId}`, { config: { presence: { key: myId } } });
      channelRef.current = channel;

      let hasJoined = false;

      channel
        .on('presence', { event: 'sync' }, () => {
          // IMPORTANT: Ignore events from old rooms if we've already moved on
          if (useRoomStore.getState().roomId !== targetRoomId) return;

          const newState = channel.presenceState();
          const presenceKeys = Object.keys(newState);
          const count = presenceKeys.length;

          // DYNAMIC SCALING: Only the person who JUST joined checks if they should move
          if (!hasJoined && type === 'random' && count > 6) {
            console.log(`[Room] Room ${targetRoomId} is full (${count}/6). Moving to next...`);
            joinRoom(name, 'random', '', myId, retryCount + 1);
            return;
          }
          
          hasJoined = true;

          const newPeers: Record<string, RoomPeer> = {};
          presenceKeys.forEach((key) => {
            if (key === myId) return;
            const userState = newState[key][0] as unknown as {
              name: string;
              status: RoomPeer['status'];
              xp: number;
              streak: number;
              level: number;
              cameraOn?: boolean;
              screenOn?: boolean;
              micOn?: boolean;
              cameraStreamId?: string | null;
              screenStreamId?: string | null;
              remainingSeconds?: number;
              timerStatus?: string;
              timerLastUpdated?: number;
            };

            newPeers[key] = {
              id: key,
              name: userState.name,
              status: userState.status,
              xp: userState.xp,
              streak: userState.streak,
              level: userState.level,
              remainingSeconds: userState.remainingSeconds,
              timerStatus: userState.timerStatus as RoomPeer['timerStatus'],
              timerLastUpdated: Date.now(), // Override with local timestamp to prevent clock skew
              stream: null, // Managed by LiveKit
              screenStream: null, // Managed by LiveKit
              countryCode: (userState as any).countryCode || 'SA'
            };
          });

          useRoomStore.setState({ peers: newPeers });
        })
        .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
          // LiveKit handles media, Supabase handles presence metadata removal
        })
        .on('broadcast', { event: 'timer_sync' }, ({ payload }: { payload: any }) => {
          if (useRoomStore.getState().roomId !== targetRoomId) return;
          const roomStore = useRoomStore.getState();
          const timerStore = useTimerStore.getState();
          
          if (payload.action === 'sync') {
            // Always update the synced display state for the banner (leader + followers see it)
            roomStore.setSyncedTimerState({
              remainingSeconds: payload.remainingSeconds,
              totalSeconds: payload.totalSeconds ?? payload.remainingSeconds,
              sessionType: payload.sessionType,
              timerStatus: payload.status,
              timestamp: Date.now() // Override with local timestamp
            });

            // Only sync local timer if I'm NOT the leader
            if (roomStore.myId !== roomStore.leaderId) {
              const isStatusDiff = timerStore.status !== payload.status;
              const isTypeDiff = timerStore.sessionType !== payload.sessionType;
              const timeDiff = Math.abs(timerStore.remainingSeconds - payload.remainingSeconds);
              
              // Force sync if status/type changed, or if time is off by more than 2 seconds
              const needsTimeSync = payload.status === 'paused' ? timeDiff > 0 : timeDiff > 2;

              if (isStatusDiff || isTypeDiff || needsTimeSync) {
                console.log('[Room] Received timer sync, adjusting...', payload);
                timerStore.setSessionType(payload.sessionType);
                timerStore.setStatus(payload.status);
                timerStore.setRemaining(payload.remainingSeconds);
                if (payload.totalSeconds) timerStore.setTotalSeconds(payload.totalSeconds);
                
                // Ensure the follower's local worker actually ticks along
                syncFollowerTimer(payload.status, payload.remainingSeconds, payload.totalSeconds);
              }
            }
          }
        })
        .on('broadcast', { event: 'peer_timer_update' }, ({ payload }: { payload: any }) => {
          if (useRoomStore.getState().roomId !== targetRoomId) return;
          if (!payload?.id) return;
          // Instantly patch this peer's timer state — no presence round-trip needed
          const { peers } = useRoomStore.getState();
          if (peers[payload.id]) {
            useRoomStore.setState({
              peers: {
                ...peers,
                [payload.id]: {
                  ...peers[payload.id],
                  timerStatus: payload.timerStatus,
                  status: payload.status,
                  remainingSeconds: payload.remainingSeconds,
                  timerLastUpdated: Date.now() // Override with local timestamp
                }
              }
            });
          }
        })
        .on('broadcast', { event: 'chat_msg' }, ({ payload }: { payload: any }) => {
          if (useRoomStore.getState().roomId !== targetRoomId) return;
          addMessage(payload);
        })
        .on('system', { event: '*' }, (payload: any) => {
          console.log('[Room] System event:', payload);
          if (payload.status === 'error') {
            setError(`System Error: ${payload.message || 'Unknown protocol error'}`);
          }
        })
      const timeout = setTimeout(() => {
        if (useRoomStore.getState().status === 'joining') {
          console.error('[Room] Connection timed out after 10s');
          setError('Connection timed out. Please check your internet or Supabase settings.');
          setStatus('error');
          if (channelRef.current) supabase.removeChannel(channelRef.current);
        }
      }, 10000);

      channel.subscribe((status: string) => {
        console.log(`[Room] Channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          // Successful connection — reset reconnect counter
          reconnectAttemptsRef.current = 0;
          setStatus('joined');
          syncPresence();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          console.error(`[Room] Channel dropped: ${status}`);
          
          // Attempt to remove the broken channel from client cache
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }

          // Don't reconnect if the user intentionally left
          if (intentionalLeaveRef.current) return;

          const MAX_RECONNECT_ATTEMPTS = 5;
          const attempt = reconnectAttemptsRef.current;

          if (attempt < MAX_RECONNECT_ATTEMPTS && lastJoinParamsRef.current) {
            reconnectAttemptsRef.current += 1;
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const delay = Math.min(2000 * Math.pow(2, attempt), 32000);
            console.log(`[Room] Reconnecting in ${delay}ms (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            // Note: We DO NOT call setStatus('joining') or setError() here.
            // Calling them would wipe the UI and cause a jarring "refresh" experience.
            // Instead, we let the UI remain in 'joined' state while it reconnects in the background.

            reconnectTimerRef.current = setTimeout(() => {
              const params = lastJoinParamsRef.current;
              if (params && !intentionalLeaveRef.current) {
                // Pass retryCount=1 (default) but isReconnect will be true internally
                joinRoom(params.name, params.type, params.code, params.userId);
              }
            }, delay);
          } else {
            // Exhausted retries — surface a clear, persistent error
            let friendlyError = `Connection lost after ${MAX_RECONNECT_ATTEMPTS} reconnect attempts.`;
            if (status === 'CLOSED') {
              friendlyError = 'Connection closed. Please check your internet or Supabase project quotas.';
            } else if (status === 'CHANNEL_ERROR') {
              friendlyError = 'Channel error. Check that Realtime is enabled for your project.';
            }
            setError(friendlyError);
            setStatus('error');
          }
        }
      }); 

    } catch (err: any) {
      console.error('Study room join failed:', err);
      setStatus('error');
    }
  }, [addMessage, resetRoom, setMyId, setMyName, setRoomCode, setRoomId, setStatus, syncPresence, supabase]);

  const createRoom = useCallback(async (name: string, userId?: string) => {
    try {
      const finalUserId = userId || crypto.randomUUID();
      setStatus('joining');
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const roomId = crypto.randomUUID();
      const { data: newRoom, error: createError } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          name: `Private Room: ${code}`,
          code,
          room_type: 'private',
          leader_id: finalUserId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('[Room] Create failed:', createError);
        setError('Failed to create room. Please try again.');
        setStatus('error');
        return;
      }

      await joinRoom(name, 'private', code, userId);
    } catch (err: any) {
      console.error('[Room] Create exception:', err);
      setError('An unexpected error occurred while creating the room.');
      setStatus('error');
    }
  }, [supabase, setStatus, setError, joinRoom]);

  const leaveRoom = useCallback(async () => {
    // Mark as intentional so the reconnect logic doesn't fire
    intentionalLeaveRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    lastJoinParamsRef.current = null;
    reconnectAttemptsRef.current = 0;
    // Clear synced timer state
    useRoomStore.getState().setSyncedTimerState(null);
    const { roomId, roomType, localStream, screenStream, setLocalStream, setScreenStream, setCameraOn, setScreenOn, setMicOn, setLiveKitToken } = useRoomStore.getState();
    
    // 1. Cleanup media tracks
    [localStream, screenStream].forEach(stream => stream?.getTracks().forEach(track => track.stop()));
    setLocalStream(null);
    setScreenStream(null);
    setCameraOn(false);
    setScreenOn(false);
    setMicOn(false);
    setLiveKitToken(null);
    
    // 2. Optional: Delete room if I'm the last one (Private Rooms only)
    if (roomId && roomType === 'private' && channelRef.current) {
      const presence = channelRef.current.presenceState();
      const count = Object.keys(presence).length;
      
      // If count is 1 or less, I am the last person leaving
      if (count <= 1) {
        console.log(`[Room] Deleting empty private room: ${roomId}`);
        await supabase.from('rooms').delete().eq('id', roomId);
      }
    }

    // 4. Remove channel and reset store
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    resetRoom();
  }, [resetRoom, supabase]);

  const sendMessage = useCallback(async (text: string) => {
    const { roomId, myId, myName, addMessage } = useRoomStore.getState();
    if (!roomId || !myId || !channelRef.current) return;

    const msg = {
      id: crypto.randomUUID(),
      fromId: myId,
      fromName: myName || 'Anonymous',
      text,
      timestamp: Date.now(),
      isOwn: true
    };

    // 1. Add locally for instant feedback
    addMessage(msg);

    // 2. Broadcast to others
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_msg',
      payload: { ...msg, isOwn: false } // Receivers should see it as NOT their own
    });
  }, []);

  return { joinRoom, createRoom, leaveRoom, sendMessage };
}
