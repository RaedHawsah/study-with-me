import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SessionType, TimerStatus } from '@/store/useTimerStore';

export interface SyncedTimerState {
  remainingSeconds: number;
  totalSeconds: number;
  sessionType: SessionType;
  timerStatus: TimerStatus;
  timestamp: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────
// ... (types stay same)
export interface RoomPeer {
  id: string;
  name: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  streak?: number;
  status: 'focus' | 'shortBreak' | 'longBreak' | 'idle';
  stream?: MediaStream | null;
  screenStream?: MediaStream | null;
  remainingSeconds?: number;
  timerStatus?: 'running' | 'paused' | 'idle';
  timerLastUpdated?: number;
  countryCode?: string;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

export type RoomStatus = 'idle' | 'joining' | 'joined' | 'error';

// ─── Initial state snapshot ───────────────────────────────────────────────────

const INITIAL_STATE = {
  status:       'idle' as RoomStatus,
  roomType:     'random' as 'random' | 'private',
  roomId:       null as string | null,
  roomCode:     null as string | null,
  myId:         null as string | null,
  myName:       '' as string,
  peers:        {} as Record<string, RoomPeer>,
  timerSync:    false, // Only for private rooms
  leaderId:     null as string | null,

  // Synced timer state (leader → followers via Realtime)
  syncedTimerState: null as SyncedTimerState | null,

  liveKitToken: null as string | null,
  
  // Local media (kept for backward compatibility during transition if needed, though LiveKit handles it)
  localStream:  null as MediaStream | null,
  screenStream: null as MediaStream | null,
  cameraOn:     false,
  screenOn:     false,
  micOn:        false,

  // Chat
  messages:    [] as ChatMessage[],
  chatOpen:    false,
  unreadCount: 0,

  errorMessage: null as string | null,
  countryCode: 'SA' as string,
};

// ─── Store ────────────────────────────────────────────────────────────────────

type RoomState = typeof INITIAL_STATE;

export interface RoomStore extends RoomState {
  setStatus:          (s: RoomStatus) => void;
  setRoomType:        (t: 'random' | 'private') => void;
  setRoomId:          (id: string)    => void;
  setRoomCode:        (c: string)    => void;
  setTimerSync:       (v: boolean)    => void;
  setMyId:            (id: string)    => void;
  setMyName:          (n: string)     => void;
  setLeaderId:        (id: string | null) => void;
  setSyncedTimerState:(s: SyncedTimerState | null) => void;
  setCountryCode:     (code: string)  => void;

  addPeer:         (peer: RoomPeer)                          => void;
  removePeer:      (id: string)                              => void;
  setPeerStream:   (peerId: string, stream: MediaStream)     => void;
  setPeerScreenStream: (peerId: string, stream: MediaStream) => void;

  setLiveKitToken: (token: string | null)                    => void;

  setLocalStream:  (s: MediaStream | null)                   => void;
  setScreenStream: (s: MediaStream | null)                   => void;
  setCameraOn:     (v: boolean)                              => void;
  setScreenOn:     (v: boolean)                              => void;
  setMicOn:        (v: boolean)                              => void;

  addMessage:      (msg: ChatMessage)                        => void;
  toggleChat:      ()                                        => void;
  setError:        (msg: string)                             => void;
  resetRoom:       ()                                        => void;

  // Global Actions (populated by RoomSessionManager)
  actions: {
    joinRoom: (name: string, type: 'random' | 'private', code?: string, userId?: string) => Promise<void>;
    createRoom: (name: string, userId?: string) => Promise<void>;
    leaveRoom: () => Promise<void>;
    sendMessage: (text: string) => Promise<void>;
  } | null;
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      actions: null,

      setStatus:           (status)           => set({ status }),
      setRoomType:         (roomType)          => set({ roomType }),
      setLiveKitToken:     (liveKitToken)      => set({ liveKitToken }),
      setRoomId:           (roomId)            => set({ roomId }),
      setRoomCode:         (roomCode)          => set({ roomCode }),
      setTimerSync:        (timerSync)         => set({ timerSync }),
      setMyId:             (myId)              => set({ myId }),
      setMyName:           (myName)            => set({ myName }),
      setLeaderId:         (leaderId)          => set({ leaderId }),
      setSyncedTimerState: (syncedTimerState)  => set({ syncedTimerState }),
      setCountryCode:      (countryCode)      => set({ countryCode }),

      addPeer: (peer) =>
        set((s) => ({ peers: { ...s.peers, [peer.id]: peer } })),

      removePeer: (id) =>
        set((s) => {
          const peers = { ...s.peers };
          delete peers[id];
          return { peers };
        }),

      setPeerStream: (peerId, stream) =>
        set((s) => ({
          peers: s.peers[peerId]
            ? { ...s.peers, [peerId]: { ...s.peers[peerId], stream } }
            : s.peers,
        })),

      setPeerScreenStream: (peerId, screenStream) =>
        set((s) => ({
          peers: s.peers[peerId]
            ? { ...s.peers, [peerId]: { ...s.peers[peerId], screenStream } }
            : s.peers,
        })),

      setLocalStream:  (localStream)  => set({ localStream }),
      setScreenStream: (screenStream) => set({ screenStream }),
      setCameraOn:     (cameraOn)     => set({ cameraOn }),
      setScreenOn:     (screenOn)     => set({ screenOn }),
      setMicOn:        (micOn)        => set({ micOn }),

      addMessage: (msg) =>
        set((s) => ({
          messages:    [...s.messages, msg],
          unreadCount: (!s.chatOpen && !msg.isOwn) ? s.unreadCount + 1 : s.unreadCount,
        })),

      toggleChat: () =>
        set((s) => ({
          chatOpen:    !s.chatOpen,
          unreadCount: !s.chatOpen ? 0 : s.unreadCount,
        })),

      setError:  (errorMessage) => set({ status: 'error', errorMessage }),
      resetRoom: ()             => set({ ...INITIAL_STATE }),
    }),
    {
      name: 'room-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential session data
      partialize: (state) => ({
        status: state.status,
        roomType: state.roomType,
        roomId: state.roomId,
        roomCode: state.roomCode,
        myId: state.myId,
        myName: state.myName,
        timerSync: state.timerSync,
        leaderId: state.leaderId,
        countryCode: state.countryCode,
      }),
    }
  )
);
