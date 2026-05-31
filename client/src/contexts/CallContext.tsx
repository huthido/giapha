import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import SimplePeer from 'simple-peer';
import { useSocket } from './SocketContext';
import type { IncomingCall } from '../types';

interface RemoteStream { userId: string; stream: MediaStream; }

interface CallContextType {
  incomingCall: IncomingCall | null;
  activeCall: { convId: string; type: 'audio' | 'video' } | null;
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  callUser: (to: string, convId: string, type: 'audio' | 'video') => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => boolean;
  toggleCamera: () => boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<{ convId: string; type: 'audio' | 'video' } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const getMedia = async (type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const createPeer = (targetUserId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new SimplePeer({ initiator, stream, trickle: true,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });

    peer.on('signal', data => {
      if (initiator) {
        socket?.emit('webrtc-offer', { to: targetUserId, offer: data, convId: activeCall?.convId });
      } else {
        socket?.emit('webrtc-answer', { to: targetUserId, answer: data, convId: activeCall?.convId });
      }
    });

    peer.on('stream', remoteStream => {
      setRemoteStreams(prev => {
        const filtered = prev.filter(r => r.userId !== targetUserId);
        return [...filtered, { userId: targetUserId, stream: remoteStream }];
      });
    });

    peer.on('close', () => {
      setRemoteStreams(prev => prev.filter(r => r.userId !== targetUserId));
      peersRef.current.delete(targetUserId);
    });

    peersRef.current.set(targetUserId, peer);
    return peer;
  };

  const stopAllStreams = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    peersRef.current.forEach(p => p.destroy());
    peersRef.current.clear();
    setRemoteStreams([]);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data: IncomingCall) => setIncomingCall(data));

    socket.on('call-accepted', async ({ from, convId }: { from: string; convId: string }) => {
      const stream = localStreamRef.current || await getMedia(activeCall?.type || 'video');
      socket.emit('join-call-room', convId);
      createPeer(from, true, stream);
    });

    socket.on('call-declined', () => { stopAllStreams(); setActiveCall(null); });
    socket.on('call-ended', ({ from }: { from: string }) => {
      peersRef.current.get(from)?.destroy();
      peersRef.current.delete(from);
      setRemoteStreams(prev => prev.filter(r => r.userId !== from));
      if (peersRef.current.size === 0) { stopAllStreams(); setActiveCall(null); }
    });

    socket.on('user-joined-call', async ({ userId }: { userId: string }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      createPeer(userId, false, stream);
    });

    socket.on('user-left-call', ({ userId }: { userId: string }) => {
      peersRef.current.get(userId)?.destroy();
      peersRef.current.delete(userId);
      setRemoteStreams(prev => prev.filter(r => r.userId !== userId));
    });

    socket.on('room-users', async ({ users }: { users: string[] }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      for (const uid of users) createPeer(uid, true, stream);
    });

    socket.on('webrtc-offer', ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      const peer = peersRef.current.get(from) || createPeer(from, false, stream);
      peer.signal(offer);
    });

    socket.on('webrtc-answer', ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      peersRef.current.get(from)?.signal(answer);
    });

    socket.on('webrtc-ice-candidate', ({ from, candidate }: { from: string; candidate: SimplePeer.SignalData }) => {
      peersRef.current.get(from)?.signal(candidate);
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-declined');
      socket.off('call-ended');
      socket.off('user-joined-call');
      socket.off('user-left-call');
      socket.off('room-users');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    };
  }, [socket, activeCall]);

  const callUser = async (to: string, convId: string, type: 'audio' | 'video') => {
    const stream = await getMedia(type);
    setActiveCall({ convId, type });
    socket?.emit('call-user', { to, convId, type });
    localStreamRef.current = stream;
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const stream = await getMedia(incomingCall.type);
    setActiveCall({ convId: incomingCall.convId, type: incomingCall.type });
    socket?.emit('call-accepted', { to: incomingCall.from, convId: incomingCall.convId });
    socket?.emit('join-call-room', incomingCall.convId);
    setIncomingCall(null);
    localStreamRef.current = stream;
  };

  const declineCall = () => {
    if (!incomingCall) return;
    socket?.emit('call-declined', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (!activeCall) return;
    socket?.emit('leave-call-room', activeCall.convId);
    remoteStreams.forEach(r => socket?.emit('call-ended', { to: r.userId, convId: activeCall.convId }));
    stopAllStreams();
    setActiveCall(null);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; return !track.enabled; }
    return false;
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return !track.enabled; }
    return false;
  };

  return (
    <CallContext.Provider value={{
      incomingCall, activeCall, localStream, remoteStreams,
      callUser, acceptCall, declineCall, endCall, toggleMute, toggleCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
