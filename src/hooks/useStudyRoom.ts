'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRoomStore, type RoomPeer, type ChatMessage } from '@/store/useRoomStore';

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:3001';

// STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ─── Singleton References ──────────────────────────────────────────────────────
let globalSocket: Socket | null = null;
let globalPeers: Record<string, RTCPeerConnection> = {};

export function useStudyRoom() {
  const {
    setStatus, setRoomId, setMyId, setMyName, addPeer, removePeer,
    setPeerStream, setLocalStream, setScreenStream, addMessage,
    setError, resetRoom, status, cameraOn, screenOn, localStream, screenStream
  } = useRoomStore();

  // ─── 1. JOIN ROOM ──────────────────────────────────────────────────────────

  const joinRoom = useCallback((name: string) => {
    resetRoom();
    setStatus('joining');
    setMyName(name);

    const socket = io(SIGNALING_URL, { reconnectionAttempts: 3 });
    globalSocket = socket;

    socket.on('connect', () => {
      socket.emit('room:join', { name });
    });

    socket.on('connect_error', () => {
      setError('Unable to connect to signaling server.');
    });

    socket.on('room:joined', ({ roomId, myId, peers }) => {
      setRoomId(roomId);
      setMyId(myId);
      setStatus('joined');

      // Add existing peers to UI
      peers.forEach((p: { id: string; name: string }) => {
        addPeer({ id: p.id, name: p.name, stream: null });
        // The NEW user initiates the call to existing users
        createPeerConnection(p.id, true);
      });
    });

    socket.on('peer:joined', ({ id, name }) => {
      addPeer({ id, name, stream: null });
      // We are an existing user; we wait for the new user to send an offer.
      createPeerConnection(id, false);
    });

    socket.on('peer:left', ({ id }) => {
      removePeer(id);
      if (globalPeers[id]) {
        globalPeers[id].close();
        delete globalPeers[id];
      }
    });

    // ── Signaling ──

    socket.on('signal:offer', async ({ from, offer }) => {
      const pc = getOrCreatePeerConnection(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal:answer', { to: from, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('signal:answer', async ({ from, answer }) => {
      const pc = getOrCreatePeerConnection(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    socket.on('signal:ice', async ({ from, candidate }) => {
      const pc = getOrCreatePeerConnection(from);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    // ── Chat ──

    socket.on('chat:message', (msg: ChatMessage) => {
      // Mark as our own if the IDs match
      addMessage({ ...msg, isOwn: msg.fromId === socket.id });
    });

  }, [addMessage, addPeer, removePeer, resetRoom, setError, setMyId, setMyName, setRoomId, setStatus]);

  // ─── 2. WEBRTC LOGIC ───────────────────────────────────────────────────────

  const getOrCreatePeerConnection = useCallback((peerId: string, initiator = false) => {
    if (globalPeers[peerId]) return globalPeers[peerId];
    return createPeerConnection(peerId, initiator);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPeerConnection = useCallback((peerId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    globalPeers[peerId] = pc;

    // Send ICE candidates to the peer
    pc.onicecandidate = (event) => {
      if (event.candidate && globalSocket) {
        globalSocket.emit('signal:ice', { to: peerId, candidate: event.candidate });
      }
    };

    // Renegotiation (needed when we add/remove tracks, e.g. turning on camera)
    pc.onnegotiationneeded = async () => {
      try {
        if (initiator || pc.signalingState !== 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          globalSocket?.emit('signal:offer', { to: peerId, offer });
        }
      } catch (err) {
        console.error('Error during renegotiation:', err);
      }
    };

    // Receive remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setPeerStream(peerId, event.streams[0]);
      }
    };

    // Add any existing local tracks (camera/screen) so the peer gets them immediately
    const store = useRoomStore.getState();
    if (store.localStream) {
      store.localStream.getTracks().forEach(t => pc.addTrack(t, store.localStream!));
    }
    if (store.screenStream) {
      store.screenStream.getTracks().forEach(t => pc.addTrack(t, store.screenStream!));
    }

    return pc;
  }, [setPeerStream]);

  // Sync our local media tracks to all peer connections whenever they change
  const syncMediaTracks = useCallback((stream: MediaStream | null, isLocal: boolean) => {
    Object.values(globalPeers).forEach((pc) => {
      const senders = pc.getSenders();
      
      if (!stream) {
        // If stream is removed, find the corresponding sender and remove it
        // A naive approach: if we turned off screen, but kept camera, we need to distinguish.
        // For simplicity, we just remove and re-add what's active.
        return; // Handled below by a full sync approach to avoid complex sender-matching
      }
      
      stream.getTracks().forEach(track => {
        // Check if track is already added
        const hasTrack = senders.some(s => s.track?.id === track.id);
        if (!hasTrack) pc.addTrack(track, stream);
      });
    });
  }, []);

  // A more robust approach to sync tracks: clear senders and re-add current streams
  const replaceAllTracks = useCallback(() => {
    const { localStream, screenStream } = useRoomStore.getState();
    const activeTracks = new Set([
      ...(localStream?.getTracks() || []),
      ...(screenStream?.getTracks() || [])
    ]);

    Object.values(globalPeers).forEach((pc) => {
      const senders = pc.getSenders();
      // Remove tracks that are no longer active
      senders.forEach(sender => {
        if (sender.track && !activeTracks.has(sender.track)) {
          pc.removeTrack(sender);
        }
      });
      // Add tracks that are not yet sending
      activeTracks.forEach(track => {
        const isSending = senders.some(s => s.track?.id === track.id);
        if (!isSending) {
          // Determine which stream it belongs to
          const stream = localStream?.getTracks().includes(track) ? localStream : screenStream;
          if (stream) pc.addTrack(track, stream);
        }
      });
    });
  }, []);

  // Whenever streams change, resync tracks with existing peers
  useEffect(() => {
    if (status === 'joined') {
      replaceAllTracks();
    }
  }, [localStream, screenStream, status, replaceAllTracks]);

  // ─── 3. MEDIA CONTROLS ─────────────────────────────────────────────────────

  const toggleCamera = useCallback(async () => {
    try {
      if (cameraOn && localStream) {
        // Turn OFF
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
        useRoomStore.getState().setCameraOn(false);
      } else {
        // Turn ON — AUDIO EXPLICITLY DISABLED
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: false 
        });
        setLocalStream(stream);
        useRoomStore.getState().setCameraOn(true);
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
      // Not throwing, just failing silently or you could show a toast
    }
  }, [cameraOn, localStream, setLocalStream]);

  const toggleScreen = useCallback(async () => {
    try {
      if (screenOn && screenStream) {
        // Turn OFF
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
        useRoomStore.getState().setScreenOn(false);
      } else {
        // Turn ON — AUDIO EXPLICITLY DISABLED
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { cursor: 'always' } as any, 
          audio: false 
        });
        
        // Handle user clicking "Stop sharing" natively in browser
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          useRoomStore.getState().setScreenOn(false);
        };
        
        setScreenStream(stream);
        useRoomStore.getState().setScreenOn(true);
      }
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  }, [screenOn, screenStream, setScreenStream]);

  // ─── 4. CHAT & CLEANUP ─────────────────────────────────────────────────────

  const sendMessage = useCallback((text: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('chat:send', { text });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    // 1. Stop all media
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    
    // 2. Close peer connections
    Object.values(globalPeers).forEach(pc => pc.close());
    globalPeers = {};

    // 3. Disconnect socket
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }

    // 4. Reset store
    resetRoom();
  }, [localStream, screenStream, resetRoom]);

  // Return functions
  return {
    joinRoom,
    leaveRoom,
    toggleCamera,
    toggleScreen,
    sendMessage,
  };
}
