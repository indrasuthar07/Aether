import { useRef, useState, useCallback } from 'react';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

type MessageType =
  | 'register'
  | 'join'
  | 'viewer-joined'
  | 'ready'
  | 'not-found'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'peer-disconnected';

type SignalingSend = (type: MessageType, payload?: Record<string, unknown>) => void;

interface UseWebRTCReturn {
  connectionState: RTCPeerConnectionState | 'new';
  dataChannel: RTCDataChannel | null;
  handleOffer: (offer: RTCSessionDescriptionInit, send: SignalingSend) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  sendInput: (data: string) => void;
  cleanup: () => void;
}

export function useWebRTC(send: SignalingSend): UseWebRTCReturn {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'new'>('new');
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef<boolean>(false);

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // Cleanup any existing connection
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.addEventListener('connectionstatechange', () => {
      setConnectionState(pc.connectionState);
    });

    pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        send('ice', { candidate: event.candidate.toJSON() });
      }
    });

    pc.addEventListener('datachannel', (event: RTCDataChannelEvent) => {
      const channel = event.channel;
      setDataChannel(channel);
    });

    return pc;
  }, [send]);

  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    const buffered = iceCandidateBufferRef.current;
    iceCandidateBufferRef.current = [];

    for (const candidate of buffered) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore invalid candidates
      }
    }
  }, []);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, _send: SignalingSend) => {
    const pc = createPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescriptionSetRef.current = true;

    // Flush any ICE candidates that arrived before the offer
    await flushIceCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    _send('answer', { answer: pc.localDescription?.toJSON() });
  }, [createPeerConnection, flushIceCandidates]);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;

    if (!pc || !remoteDescriptionSetRef.current) {
      // Buffer the candidate until remote description is set
      iceCandidateBufferRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore invalid candidates
    }
  }, []);

  const sendInput = useCallback((data: string) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(data);
    }
  }, [dataChannel]);

  const cleanup = useCallback(() => {
    if (dataChannel) {
      dataChannel.close();
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteDescriptionSetRef.current = false;
    iceCandidateBufferRef.current = [];
    setDataChannel(null);
    setConnectionState('new');
  }, [dataChannel]);

  return {
    connectionState,
    dataChannel,
    handleOffer,
    handleIceCandidate,
    sendInput,
    cleanup
  };
}
