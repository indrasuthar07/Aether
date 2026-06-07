import { useRef, useState, useCallback } from 'react';
import { ICE_SERVERS } from '../types';
import type { SignalingSend } from '../types';

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
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const sendRef = useRef<SignalingSend>(send);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'new'>('new');
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef<boolean>(false);

  sendRef.current = send;

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
        sendRef.current('ice', { candidate: event.candidate.toJSON() });
      }
    });

    pc.addEventListener('datachannel', (event: RTCDataChannelEvent) => {
      const channel = event.channel;
      dataChannelRef.current = channel;
      setDataChannel(channel);
    });

    return pc;
  }, []);

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
    const dc = dataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(data);
    }
  }, []);

  // Uses refs to avoid stale closure over dataChannel state
  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteDescriptionSetRef.current = false;
    iceCandidateBufferRef.current = [];
    setDataChannel(null);
    setConnectionState('new');
  }, []);

  return {
    connectionState,
    dataChannel,
    handleOffer,
    handleIceCandidate,
    sendInput,
    cleanup,
  };
}
