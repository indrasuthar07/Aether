import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBar, { type ConnectionStatus } from '../components/StatusBar';
import TerminalView, { type TerminalViewHandle } from '../components/TerminalView';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';

export type MessageType =
  | 'register'
  | 'join'
  | 'viewer-joined'
  | 'ready'
  | 'not-found'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'peer-disconnected';
export interface SignalingMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

function TerminalPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [sessionEnded, setSessionEnded] = useState(false);
  const terminalViewRef = useRef<TerminalViewHandle>(null);
  const hasJoinedRef = useRef(false);

  const handleMessage = useCallback((message: SignalingMessage) => {
    switch (message.type) {
      case 'ready':
        setStatus('waiting');
        break;
      case 'not-found':
        setStatus('error');
        break;
      case 'offer': {
        const offer = message.payload?.offer as RTCSessionDescriptionInit | undefined;
        if (offer) {
          handleOfferRef.current(offer);
        }
        break;
      }
      case 'ice': {
        const candidate = message.payload?.candidate as RTCIceCandidateInit | undefined;
        if (candidate) {
          handleIceCandidateRef.current(candidate);
        }
        break;
      }
      case 'peer-disconnected':
        setStatus('disconnected');
        setSessionEnded(true);
        break;
    }
  }, []);

  const { send, readyState } = useSignaling(handleMessage);

  const { dataChannel, handleOffer, handleIceCandidate, sendInput, cleanup: cleanupWebRTC } = useWebRTC(send);

  // Store refs to avoid stale closures in the message handler
  const handleOfferRef = useRef(async (offer: RTCSessionDescriptionInit) => {
    await handleOffer(offer, send);
  });
  const handleIceCandidateRef = useRef(handleIceCandidate);

  useEffect(() => {
    handleOfferRef.current = async (offer: RTCSessionDescriptionInit) => {
      await handleOffer(offer, send);
    };
  }, [handleOffer, send]);

  useEffect(() => {
    handleIceCandidateRef.current = handleIceCandidate;
  }, [handleIceCandidate]);

  // Join the session once WS is open
  useEffect(() => {
    if (readyState === WebSocket.OPEN && code && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      send('join', { code });
    }
  }, [readyState, code, send]);

  // Handle DataChannel events
  useEffect(() => {
    if (!dataChannel) return;

    const handleOpen = () => {
      setStatus('live');
    };

    const handleChannelMessage = (event: MessageEvent) => {
      const data = event.data;
      if (typeof data === 'string') {
        terminalViewRef.current?.write(data);
      } else if (data instanceof ArrayBuffer) {
        const decoded = new TextDecoder().decode(data);
        terminalViewRef.current?.write(decoded);
      } else if (data instanceof Blob) {
        data.text().then((text: string) => {
          terminalViewRef.current?.write(text);
        }).catch(() => {
          // Ignore blob read errors
        });
      }
    };

    const handleClose = () => {
      if (status === 'live') {
        setStatus('disconnected');
        setSessionEnded(true);
      }
    };

    const handleError = () => {
      setStatus('error');
    };

    dataChannel.addEventListener('open', handleOpen);
    dataChannel.addEventListener('message', handleChannelMessage);
    dataChannel.addEventListener('close', handleClose);
    dataChannel.addEventListener('error', handleError);

    // If the channel is already open (race condition)
    if (dataChannel.readyState === 'open') {
      setStatus('live');
    }

    return () => {
      dataChannel.removeEventListener('open', handleOpen);
      dataChannel.removeEventListener('message', handleChannelMessage);
      dataChannel.removeEventListener('close', handleClose);
      dataChannel.removeEventListener('error', handleError);
    };
  }, [dataChannel, status]);

  // Terminal input → DataChannel
  const handleTerminalInput = useCallback((data: string) => {
    sendInput(data);
  }, [sendInput]);

  // Terminal resize → DataChannel
  const handleTerminalResize = useCallback((cols: number, rows: number) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, [dataChannel]);

  // Disconnect handler
  const handleDisconnect = useCallback(() => {
    cleanupWebRTC();
    navigate('/');
  }, [cleanupWebRTC, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <StatusBar
        status={status}
        code={code || ''}
        onDisconnect={handleDisconnect}
      />

      {/* Terminal area — offset by status bar height */}
      <div className="flex-1 mt-10 relative">
        <TerminalView
          ref={terminalViewRef}
          onInput={handleTerminalInput}
          onResize={handleTerminalResize}
        />

        {/* Session ended overlay */}
        {sessionEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-40">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Session ended</h2>
              <p className="text-zinc-400 mb-8">The host has disconnected.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-100"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && !sessionEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-40">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Session not found</h2>
              <p className="text-zinc-400 mb-8">No active session with code <span className="font-mono text-zinc-300">{code}</span></p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-100"
              >
                Try Another Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TerminalPage;
