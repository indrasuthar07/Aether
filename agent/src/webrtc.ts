import wrtc from '@roamhq/wrtc';

const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = wrtc;

// Public types 
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

export interface PeerConfig {
  iceServers: Array<{ urls: string; username?: string; credential?: string }>;
}

// Public API for the agent-side peer connection.
export interface AgentPeer {
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  setRemoteDescription: (answer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  onIceCandidate: (callback: (candidate: RTCIceCandidateInit) => void) => void;
  setDataChannelEvents: (events: DataChannelEvents) => void;
  sendData: (data: string) => void;
  isDataChannelOpen: () => boolean;
  close: () => void;
}

// Factory 
export function createAgentPeer(peerConfig: PeerConfig): AgentPeer {
  const pc = new RTCPeerConnection({ iceServers: peerConfig.iceServers });
  const dataChannel = pc.createDataChannel('terminal', { ordered: true });

  let remoteDescriptionSet = false;
  const bufferedCandidates: RTCIceCandidateInit[] = [];
  let iceCandidateCallback: ((candidate: RTCIceCandidateInit) => void) | null = null;

  // ICE candidate forwarding 
  pc.onicecandidate = (event: {
    candidate: {
      candidate: string;
      sdpMid: string | null;
      sdpMLineIndex: number | null;
      usernameFragment: string | null;
    } | null;
  }) => {
    if (event.candidate && iceCandidateCallback) {
      iceCandidateCallback({
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        usernameFragment: event.candidate.usernameFragment,
      });
    }
  };

  // SDP negotiation 
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

    // Flush ICE candidates that arrived before the remote description
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

  // Callbacks 
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

  // Data channel helpers 
  function sendData(data: string): void {
    try {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(data);
      }
    } catch {
      // DataChannel may have closed mid-send
    }
  }

  function isDataChannelOpen(): boolean {
    return dataChannel.readyState === 'open';
  }

  // Teardown 
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
    createOffer,
    setRemoteDescription,
    addIceCandidate,
    onIceCandidate,
    setDataChannelEvents,
    sendData,
    isDataChannelOpen,
    close,
  };
}
