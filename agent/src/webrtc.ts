import wrtc from '@roamhq/wrtc';

const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = wrtc;

export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface DataChannelEvents {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
}

export interface AgentPeer {
  pc: InstanceType<typeof RTCPeerConnection>;
  dataChannel: ReturnType<InstanceType<typeof RTCPeerConnection>['createDataChannel']>;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  setRemoteDescription: (answer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  onIceCandidate: (callback: (candidate: RTCIceCandidateInit) => void) => void;
  setDataChannelEvents: (events: DataChannelEvents) => void;
  close: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function createAgentPeer(): AgentPeer {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const dataChannel = pc.createDataChannel('terminal', { ordered: true });

  let remoteDescriptionSet = false;
  const bufferedCandidates: RTCIceCandidateInit[] = [];
  let iceCandidateCallback: ((candidate: RTCIceCandidateInit) => void) | null = null;

  // Emit local ICE candidates to signaling
  pc.onicecandidate = (event: { candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null; usernameFragment: string | null } | null }) => {
    if (event.candidate && iceCandidateCallback) {
      iceCandidateCallback({
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        usernameFragment: event.candidate.usernameFragment,
      });
    }
  };

  async function createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return {
      type: offer.type as RTCSessionDescriptionInit['type'],
      sdp: offer.sdp,
    };
  }

  async function setRemoteDescription(answer: RTCSessionDescriptionInit): Promise<void> {
    const desc = new RTCSessionDescription(answer);
    await pc.setRemoteDescription(desc);
    remoteDescriptionSet = true;

    // Flush buffered ICE candidates
    for (const candidate of bufferedCandidates) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    bufferedCandidates.length = 0;
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!remoteDescriptionSet) {
      bufferedCandidates.push(candidate);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  function onIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    iceCandidateCallback = callback;
  }

  function setDataChannelEvents(events: DataChannelEvents): void {
    if (events.onOpen) {
      dataChannel.onopen = events.onOpen;
    }
    if (events.onMessage) {
      const handler = events.onMessage;
      dataChannel.onmessage = (event: { data: string }) => {
        handler(typeof event.data === 'string' ? event.data : String(event.data));
      };
    }
    if (events.onClose) {
      dataChannel.onclose = events.onClose;
    }
    if (events.onError) {
      const errorHandler = events.onError;
      dataChannel.onerror = (event: { error?: Error }) => {
        errorHandler(event.error || new Error('DataChannel error'));
      };
    }
  }

  function close(): void {
    try {
      dataChannel.close();
    } catch {
      // already closed
    }
    try {
      pc.close();
    } catch {
      // already closed
    }
  }

  return {
    pc,
    dataChannel,
    createOffer,
    setRemoteDescription,
    addIceCandidate,
    onIceCandidate,
    setDataChannelEvents,
    close,
  };
}
