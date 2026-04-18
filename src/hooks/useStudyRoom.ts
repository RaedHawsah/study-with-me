'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import { useRoomStore, type RoomPeer } from '@/store/useRoomStore';
import { useTimerStore } from '@/store/useTimerStore';
import { useGamificationStore } from '@/store/useGamificationStore';

export function useStudyRoom() {
  const supabase = createSupabaseClient();
  const {
    setStatus, setRoomId, setRoomCode, setMyId, setMyName, 
    addPeer, removePeer, addMessage, setError, resetRoom, 
    status, roomId, peers, setLeaderId
  } = useRoomStore();
  
  const timerStore = useTimerStore();
  const { totalXp, currentStreak } = useGamificationStore();
  const channelRef = useRef<any>(null);
  
  // WebRTC Refs
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const makingOffer = useRef<Record<string, boolean>>({});
  const ignoreOffer = useRef<Record<string, boolean>>({});

  const syncPresence = useCallback(() => {
    if (!channelRef.current) return;
    
    const state = useTimerStore.getState();
    const roomStore = useRoomStore.getState();
    const myStatus = state.status === 'running' ? state.sessionType : 'idle';
    const myLevel = Math.max(1, Math.floor((totalXp || 0) / 500) + 1);
    
    channelRef.current.track({
      id: roomStore.myId,
      name: roomStore.myName,
      xp: totalXp || 0,
      level: myLevel,
      streak: currentStreak || 0,
      status: myStatus,
      cameraOn: roomStore.cameraOn,
      screenOn: roomStore.screenOn,
      cameraStreamId: roomStore.localStream?.id || null,
      screenStreamId: roomStore.screenStream?.id || null,
      last_updated: new Date().toISOString()
    });
  }, [totalXp, currentStreak]);

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

      // Identify stream based on Presence metadata
      const peerState = channelRef.current?.presenceState()[peerId]?.[0];
      if (peerState) {
        if (stream.id === peerState.cameraStreamId) {
          useRoomStore.getState().setPeerStream(peerId, stream);
        } else if (stream.id === peerState.screenStreamId) {
          useRoomStore.getState().setPeerScreenStream(peerId, stream);
        } else {
          // Fallback if IDs don't match exactly yet
          useRoomStore.getState().setPeerStream(peerId, stream);
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
    const { localStream, screenStream } = useRoomStore.getState();
    syncPresence();

    Object.values(pcs.current).forEach((pc) => {
      const senders = pc.getSenders();
      senders.forEach(s => pc.removeTrack(s));
      
      if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
      if (screenStream) screenStream.getTracks().forEach(t => pc.addTrack(t, screenStream));
    });
  }, [useRoomStore.getState().cameraOn, useRoomStore.getState().screenOn, syncPresence]);

  const joinRoom = useCallback(async (name: string, type: 'random' | 'private', code?: string, userId?: string) => {
    try {
      // Ensure any existing channel is removed before joining a new one to avoid terminal CLOSED states
      if (channelRef.current) {
        console.log('[Room] Cleaning up existing channel before join attempt');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      resetRoom();
      setStatus('joining');
      setMyName(name);

      let myId = userId;
      if (!myId) {
        const { data: { user } } = await supabase.auth.getUser();
        myId = user?.id || crypto.randomUUID();
      }
      setMyId(myId as string);

      let targetRoomId = '';
      let targetCode = code || '';

      if (type === 'random') {
        targetRoomId = 'global-random-1';
        setLeaderId(null);
      } else {
        const { data: roomData, error: roomError } = await supabase.from('rooms').select('*').eq('code', targetCode).single();
        if (roomError || !roomData) {
          setError('Room not found.');
          return;
        }
        targetRoomId = roomData.id;
        setLeaderId(roomData.leader_id);
      }

      setRoomId(targetRoomId);
      setRoomCode(targetCode);

      const channel = supabase.channel(`room:${targetRoomId}`, { config: { presence: { key: myId } } });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const newPeers: Record<string, RoomPeer> = {};
          
          Object.keys(newState).forEach((key) => {
            if (key === myId) return;
            const userState = newState[key][0] as any;
            newPeers[key] = {
              id: key,
              name: userState.name,
              status: userState.status,
              xp: userState.xp,
              streak: userState.streak,
              level: userState.level,
              stream: useRoomStore.getState().peers[key]?.stream || null,
              screenStream: useRoomStore.getState().peers[key]?.screenStream || null
            };

            if (!pcs.current[key]) createPeerConnection(key);
          });

          useRoomStore.setState({ peers: newPeers });
        })
        .on('broadcast', { event: 'webrtc_signal' }, handleSignal)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'room_messages',
          filter: `room_id=eq.${targetRoomId}`
        }, async (payload: { new: any }) => {
          const msg = payload.new;
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', msg.user_id).single();
          addMessage({
            id: msg.id,
            fromId: msg.user_id,
            fromName: profile?.full_name || 'Anonymous',
            text: msg.content,
            timestamp: new Date(msg.created_at).getTime(),
            isOwn: msg.user_id === myId
          });
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

  const leaveRoom = useCallback(async () => {
    const { localStream, screenStream, setLocalStream, setScreenStream, setCameraOn, setScreenOn } = useRoomStore.getState();
    [localStream, screenStream].forEach(stream => stream?.getTracks().forEach(track => track.stop()));
    setLocalStream(null);
    setScreenStream(null);
    setCameraOn(false);
    setScreenOn(false);

    Object.values(pcs.current).forEach(pc => { try { pc.close(); } catch(e) {} });
    pcs.current = {};
    makingOffer.current = {};
    ignoreOffer.current = {};

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    resetRoom();
  }, [resetRoom, supabase]);

  const sendMessage = useCallback(async (text: string) => {
    const { roomId, myId } = useRoomStore.getState();
    if (!roomId || !myId) return;
    await supabase.from('room_messages').insert({ room_id: roomId, user_id: myId, content: text });
  }, [supabase]);

  return { joinRoom, leaveRoom, sendMessage };
}
