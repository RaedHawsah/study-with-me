/**
 * Room Store — ephemeral (intentionally NOT persisted).
 *
 * Each user's theme / audio preferences remain untouched in their own
 * usePreferencesStore — this store only tracks transient room state.
 */
import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomPeer {
  id: string;
  name: string;
  stream: MediaStream | null;
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
  roomId:       null as string | null,
  myId:         null as string | null,
  myName:       '' as string,
  peers:        {} as Record<string, RoomPeer>,

  // Local media — camera & screen share are always audio-free
  localStream:  null as MediaStream | null,
  screenStream: null as MediaStream | null,
  cameraOn:     false,
  screenOn:     false,

  // Chat
  messages:    [] as ChatMessage[],
  chatOpen:    false,
  unreadCount: 0,

  errorMessage: null as string | null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

type RoomState = typeof INITIAL_STATE;

export interface RoomStore extends RoomState {
  setStatus:       (s: RoomStatus) => void;
  setRoomId:       (id: string)    => void;
  setMyId:         (id: string)    => void;
  setMyName:       (n: string)     => void;

  addPeer:         (peer: RoomPeer)                          => void;
  removePeer:      (id: string)                              => void;
  setPeerStream:   (peerId: string, stream: MediaStream)     => void;

  setLocalStream:  (s: MediaStream | null)                   => void;
  setScreenStream: (s: MediaStream | null)                   => void;
  setCameraOn:     (v: boolean)                              => void;
  setScreenOn:     (v: boolean)                              => void;

  addMessage:      (msg: ChatMessage)                        => void;
  toggleChat:      ()                                        => void;
  setError:        (msg: string)                             => void;
  resetRoom:       ()                                        => void;
}

export const useRoomStore = create<RoomStore>()((set) => ({
  ...INITIAL_STATE,

  setStatus:  (status)  => set({ status }),
  setRoomId:  (roomId)  => set({ roomId }),
  setMyId:    (myId)    => set({ myId }),
  setMyName:  (myName)  => set({ myName }),

  addPeer: (peer) =>
    set((s) => ({ peers: { ...s.peers, [peer.id]: peer } })),

  removePeer: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.peers;
      return { peers: rest };
    }),

  setPeerStream: (peerId, stream) =>
    set((s) => ({
      peers: s.peers[peerId]
        ? { ...s.peers, [peerId]: { ...s.peers[peerId], stream } }
        : s.peers,
    })),

  setLocalStream:  (localStream)  => set({ localStream }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setCameraOn:     (cameraOn)     => set({ cameraOn }),
  setScreenOn:     (screenOn)     => set({ screenOn }),

  addMessage: (msg) =>
    set((s) => ({
      messages:    [...s.messages, msg],
      // Only increment badge if chat panel is closed AND message is from another user
      unreadCount: (!s.chatOpen && !msg.isOwn) ? s.unreadCount + 1 : s.unreadCount,
    })),

  toggleChat: () =>
    set((s) => ({
      chatOpen:    !s.chatOpen,
      unreadCount: !s.chatOpen ? 0 : s.unreadCount, // clear badge when opening
    })),

  setError:  (errorMessage) => set({ status: 'error', errorMessage }),
  resetRoom: ()             => set({ ...INITIAL_STATE }),
}));
