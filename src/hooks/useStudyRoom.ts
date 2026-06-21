'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import { useRoomStore, type RoomPeer } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { useGamificationStore } from '@/store/useGamificationStore';
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
  
  // WebRTC Refs
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const makingOffer = useRef<Record<string, boolean>>({});
  const ignoreOffer = useRef<Record<string, boolean>>({});

  const syncPresence = useCallback(() => {
    if (!channelRef.current) return;
    
    const timer = useTimerStore.getState();
    const roomStore = useRoomStore.getState();
    const myLevel = Math.max(1, Math.floor((totalXp || 0) / 500) + 1);
    
    channelRef.current.track({
      id: roomStore.myId,
      name: roomStore.myName,
      xp: totalXp || 0,
      level: myLevel,
      streak: currentStreak || 0,
      status: timer.status === 'running' ? timer.sessionType : 'idle',
      // New Timer Metadata
      timerStatus: timer.status,
      remainingSeconds: timer.remainingSeconds,
      sessionType: timer.sessionType,
      timerLastUpdated: Date.now(),
      cameraOn: roomStore.cameraOn,
      screenOn: roomStore.screenOn,
      cameraStreamId: roomStore.localStream?.id || null,
      screenStreamId: roomStore.screenStream?.id || null,
      last_updated: new Date().toISOString()
    });
  }, [totalXp, currentStreak]);

  useEffect(() => {
    const { localStream, screenStream } = useRoomStore.getState();
    Object.values(pcs.current).forEach(pc => {
      const senders = pc.getSenders();
      const localVideoTrack = localStream?.getVideoTracks()[0];
      if (localVideoTrack && !senders.find(s => s.track?.id === localVideoTrack.id)) {
        pc.addTrack(localVideoTrack, localStream!);
      }
      const screenVideoTrack = screenStream?.getVideoTracks()[0];
      if (screenVideoTrack && !senders.find(s => s.track?.id === screenVideoTrack.id)) {
        pc.addTrack(screenVideoTrack, screenStream!);
      }
    });
    syncPresence();
  }, [localStream, screenStream, syncPresence]);
  const createPeerConnection = useCallback((peerId: string) => {
    if (pcs.current[peerId]) return pcs.current[peerId];

    const myId = useRoomStore.getState().myId || '';
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { to: peerId, from: myId, ice: candidate }
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current[peerId] = true;
        await pc.setLocalDescription();
        channelRef.current?.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { to: peerId, from: myId, sdp: pc.localDescription }
        });
      } catch (err) {
        console.error('Negotiation error:', err);
      } finally {
        makingOffer.current[peerId] = false;
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      // Cache the stream on the peer connection object
      const customPc = pc as any;
      customPc.remoteStreams = customPc.remoteStreams || [];
      if (!customPc.remoteStreams.some((s: MediaStream) => s.id === stream.id)) {
        customPc.remoteStreams.push(stream);
      }

      // Identify stream based on Presence metadata
      const peerState = (channelRef.current?.presenceState()[peerId]?.[0]) as any;
      if (peerState) {
        if (stream.id === peerState.cameraStreamId) {
          useRoomStore.getState().setPeerStream(peerId, stream);
        } else if (stream.id === peerState.screenStreamId) {
          useRoomStore.getState().setPeerScreenStream(peerId, stream);
        } else {
          // Logical fallback based on status flags
          if (peerState.cameraOn && !peerState.screenOn) {
            useRoomStore.getState().setPeerStream(peerId, stream);
          } else if (peerState.screenOn && !peerState.cameraOn) {
            useRoomStore.getState().setPeerScreenStream(peerId, stream);
          } else {
            useRoomStore.getState().setPeerStream(peerId, stream);
          }
        }
      } else {
        useRoomStore.getState().setPeerStream(peerId, stream);
      }
    };

    const { localStream, screenStream } = useRoomStore.getState();
    if (localStream) localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    if (screenStream) screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));

    pcs.current[peerId] = pc;
    return pc;
  }, []);

  const handleSignal = useCallback(async ({ payload }: { payload: any }) => {
    const { from, to, sdp, ice } = payload;
    const myId = useRoomStore.getState().myId;
    if (to !== myId) return;
    if (from === myId) return;

    let pc = pcs.current[from];
    if (!pc) pc = createPeerConnection(from);

    try {
      if (sdp) {
        const isPolite = (myId || '') < from;
        const offerCollision = sdp.type === 'offer' && (makingOffer.current[from] || pc.signalingState !== 'stable');
        
        ignoreOffer.current[from] = !isPolite && offerCollision;
        if (ignoreOffer.current[from]) return;

        await pc.setRemoteDescription(sdp);
        if (sdp.type === 'offer') {
          await pc.setLocalDescription();
          channelRef.current?.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { to: from, from: myId, sdp: pc.localDescription }
          });
        }
      } else if (ice) {
        try {
          await pc.addIceCandidate(ice);
        } catch (err) {
          if (!ignoreOffer.current[from]) throw err;
        }
      }
    } catch (err) {
      console.error('Signaling error:', err);
    }
  }, [createPeerConnection]);

  // Force renegotiation on all PCs when local streams change
  useEffect(() => {
    syncPresence();

    Object.values(pcs.current).forEach((pc) => {
      const senders = pc.getSenders();
      senders.forEach(s => {
        try {
          pc.removeTrack(s);
        } catch (e) {
          console.error('Failed to remove track:', e);
        }
      });
      
      if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
      if (screenStream) screenStream.getTracks().forEach(t => pc.addTrack(t, screenStream));
    });
  }, [cameraOn, screenOn, localStream, screenStream, syncPresence]);

  // Sync Presence when Timer changes
  useEffect(() => {
    syncPresence();
  }, [timerStore.status, timerStore.sessionType, syncPresence]);

  // Broadcast Timer State (Only if Leader & Sync is ON)
  useEffect(() => {
    const roomStore = useRoomStore.getState();
    const timer = useTimerStore.getState();

    if (
      channelRef.current && 
      roomStore.roomType === 'private' && 
      roomStore.myId === roomStore.leaderId && 
      timerSync
    ) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: {
          action: 'sync',
          status: timer.status,
          sessionType: timer.sessionType,
          remainingSeconds: timer.remainingSeconds,
          timestamp: Date.now()
        }
      });
    }
  }, [timerStore.status, timerStore.sessionType, timerSync]);

  const joinRoom = useCallback(async (name: string, type: 'random' | 'private', code?: string, userId?: string, retryCount = 1) => {
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

      if (retryCount === 1) {
        resetRoom();
        setStatus('joining');
        setMyName(name);
      }

      let myId = userId;
      if (!myId) {
        const { data: { user } } = await supabase.auth.getUser();
        myId = user?.id || crypto.randomUUID();
      }
      setMyId(myId as string);

      let targetRoomId = '';
      let targetCode = (code || '').trim().toUpperCase();

      if (type === 'random') {
        targetRoomId = `global-random-${retryCount}`;
        setLeaderId(null);
        
        // Ensure the dynamic random room exists in the DB
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

      setRoomId(targetRoomId);
      setRoomCode(targetCode);
      useRoomStore.getState().setRoomType(type);
      
      // Clear peers immediately when trying a new room
      useRoomStore.setState({ peers: {} });

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
              cameraStreamId?: string | null;
              screenStreamId?: string | null;
              remainingSeconds?: number;
              timerStatus?: string;
              timerLastUpdated?: number;
            };

            // Resolve streams from peer connection cache
            const peerPc = pcs.current[key] as any;
            let stream = useRoomStore.getState().peers[key]?.stream || null;
            let screenStream = useRoomStore.getState().peers[key]?.screenStream || null;

            if (peerPc && peerPc.remoteStreams && peerPc.remoteStreams.length > 0) {
              const remoteStreams = peerPc.remoteStreams as MediaStream[];
              
              // 1. Try matching by stream ID
              const matchedCamera = remoteStreams.find(s => s.id === userState.cameraStreamId);
              const matchedScreen = remoteStreams.find(s => s.id === userState.screenStreamId);
              
              if (matchedCamera) stream = matchedCamera;
              if (matchedScreen) screenStream = matchedScreen;

              // 2. Logical fallback for unmatched streams
              if (!matchedCamera && userState.cameraOn) {
                const candidate = remoteStreams.find(s => s.id !== userState.screenStreamId);
                if (candidate) stream = candidate;
              }
              if (!matchedScreen && userState.screenOn) {
                const candidate = remoteStreams.find(s => s.id !== userState.cameraStreamId);
                if (candidate) screenStream = candidate;
              }
            }

            newPeers[key] = {
              id: key,
              name: userState.name,
              status: userState.status,
              xp: userState.xp,
              streak: userState.streak,
              level: userState.level,
              remainingSeconds: userState.remainingSeconds,
              timerStatus: userState.timerStatus as RoomPeer['timerStatus'],
              timerLastUpdated: userState.timerLastUpdated,
              stream: userState.cameraOn ? stream : null,
              screenStream: userState.screenOn ? screenStream : null
            };

            if (!pcs.current[key]) createPeerConnection(key);
          });

          useRoomStore.setState({ peers: newPeers });
        })
        .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
          // Immediate WebRTC cleanup when someone leaves
          if (pcs.current[key]) {
            pcs.current[key].close();
            delete pcs.current[key];
            delete makingOffer.current[key];
            delete ignoreOffer.current[key];
          }
        })
        .on('broadcast', { event: 'webrtc_signal' }, (payload: any) => {
          if (useRoomStore.getState().roomId !== targetRoomId) return;
          handleSignal(payload);
        })
        .on('broadcast', { event: 'timer_sync' }, ({ payload }: { payload: any }) => {
          if (useRoomStore.getState().roomId !== targetRoomId) return;
          const roomStore = useRoomStore.getState();
          const timerStore = useTimerStore.getState();
          
          // Only sync if I'm NOT the leader (followers follow the leader)
          if (roomStore.myId !== roomStore.leaderId) {
            console.log('[Room] Received timer sync:', payload);
            
            if (payload.action === 'sync') {
              timerStore.setSessionType(payload.sessionType);
              timerStore.setStatus(payload.status);
              timerStore.setRemaining(payload.remainingSeconds);
            }
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
          setStatus('joined');
          syncPresence();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          console.error(`[Room] Failed to join: ${status}`);
          
          let friendlyError = `Failed to join: ${status}`;
          if (status === 'CLOSED') {
            friendlyError = 'Connection closed. If this persists, please ensure Realtime is enabled in your Supabase dashboard or check your project quotas.';
          } else if (status === 'CHANNEL_ERROR') {
            friendlyError = 'Channel error. This often happens if the API key is incorrect or Realtime is restricted for your project.';
          }
          
          setError(friendlyError);
          setStatus('error');
          
          // Attempt to remove the broken channel from client cache
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        }
      }); 

    } catch (err: any) {
      console.error('Study room join failed:', err);
      setStatus('error');
    }
  }, [addMessage, resetRoom, setMyId, setMyName, setRoomCode, setRoomId, setStatus, syncPresence, supabase, createPeerConnection, handleSignal]);

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
    const { roomId, roomType, localStream, screenStream, setLocalStream, setScreenStream, setCameraOn, setScreenOn } = useRoomStore.getState();
    
    // 1. Cleanup media tracks
    [localStream, screenStream].forEach(stream => stream?.getTracks().forEach(track => track.stop()));
    setLocalStream(null);
    setScreenStream(null);
    setCameraOn(false);
    setScreenOn(false);
    
    // 2. Close WebRTC connections
    Object.values(pcs.current).forEach(pc => { try { pc.close(); } catch(e) {} });
    pcs.current = {};
    makingOffer.current = {};
    ignoreOffer.current = {};
    
    // 3. Optional: Delete room if I'm the last one (Private Rooms only)
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
