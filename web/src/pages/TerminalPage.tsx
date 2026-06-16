import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBar, { type ConnectionStatus } from '../components/StatusBar';
import TerminalView, { type TerminalViewHandle } from '../components/TerminalView';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import { isValidSessionCode } from '../types';
import type { SignalingMessage } from '../types';
import { Home, LogOut, AlertCircle } from 'lucide-react';

function TerminalPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [sessionEnded, setSessionEnded] = useState(false);
  const terminalViewRef = useRef<TerminalViewHandle>(null);
  const hasJoinedRef = useRef(false);
  const statusRef = useRef<ConnectionStatus>(status);

  statusRef.current = status;

  useEffect(() => {
    if (!isValidSessionCode(code)) {
      navigate('/term', { replace: true });
    }
  }, [code, navigate]);

  const handleMessage = useCallback((message: SignalingMessage) => {
    switch (message.type) {
      case 'ready':
        setStatus('waiting');
        break;
      case 'not-found':
        setStatus('error');
        break;
      case 'offer': {
        const offer = message.payload?.['offer'] as RTCSessionDescriptionInit | undefined;
        if (offer) {
          handleOfferRef.current(offer);
        }
        break;
      }
      case 'ice': {
        const candidate = message.payload?.['candidate'] as RTCIceCandidateInit | undefined;
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
    if (readyState === WebSocket.OPEN && isValidSessionCode(code) && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      send('join', { code });
    }
  }, [readyState, code, send]);

  // Handle DataChannel events
  useEffect(() => {
    if (!dataChannel) return;

    let syncInterval: ReturnType<typeof setInterval>;

    const handleOpen = () => {
      setStatus('live');
      
      // Trigger a fit immediately to send initial dimensions
      setTimeout(() => {
        terminalViewRef.current?.fit();
      }, 50);

      syncInterval = setInterval(() => {
        if (statusRef.current === 'live') {
          terminalViewRef.current?.fit();
        }
      }, 2000);
    };

    const handleChannelMessage = (event: MessageEvent) => {
      const data: unknown = event.data;
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
      // Use ref to avoid stale status in this closure
      if (statusRef.current === 'live') {
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
      if (syncInterval) clearInterval(syncInterval);
      dataChannel.removeEventListener('open', handleOpen);
      dataChannel.removeEventListener('message', handleChannelMessage);
      dataChannel.removeEventListener('close', handleClose);
      dataChannel.removeEventListener('error', handleError);
    };
  }, [dataChannel]);

  // Terminal input → DataChannel
  const handleTerminalInput = useCallback((data: string) => {
    sendInput(data);
  }, [sendInput]);

  // Terminal resize → DataChannel (uses sendInput for abstraction)
  const handleTerminalResize = useCallback((cols: number, rows: number) => {
    sendInput(JSON.stringify({ type: 'resize', cols, rows }));
  }, [sendInput]);

  // Disconnect handler
  const handleDisconnect = useCallback(() => {
    cleanupWebRTC();
    navigate('/');
  }, [cleanupWebRTC, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] font-sans antialiased">
      <StatusBar
        status={status}
        code={code || ''}
        onDisconnect={handleDisconnect}
      />

      <div className="flex-1 mt-12 relative min-h-0 overflow-hidden">
        <TerminalView
          ref={terminalViewRef}
          onInput={handleTerminalInput}
          onResize={handleTerminalResize}
        />

        {/* Brand-Matched Session Ended Overlay */}
        {sessionEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-aether-bg/95 backdrop-blur-md z-40">
            <div className="text-center max-w-md mx-auto px-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center shadow-sm">
                <LogOut size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-bold text-aether-ink tracking-tight mb-3">Session ended</h2>
              <p className="text-base text-aether-ink/70 font-medium mb-8 leading-relaxed">
                The host has closed the connection. Your session has been safely disconnected.
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-900 text-white px-8 py-3.5 hover:bg-blue-800 transition-colors shadow-lg"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Brand-Matched Error Overlay */}
        {status === 'error' && !sessionEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-aether-bg/95 backdrop-blur-md z-40">
            <div className="text-center max-w-md mx-auto px-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-sm">
                <AlertCircle size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-bold text-aether-ink tracking-tight mb-3">Session not found</h2>
              <p className="text-base text-aether-ink/70 font-medium mb-8 leading-relaxed">
                We couldn&apos;t find an active terminal session matching code <br />
                <span className="inline-block mt-3 bg-black/5 px-3 py-1 rounded-md text-aether-ink font-mono text-lg border border-black/5 tracking-widest">
                  {code}
                </span>
              </p>
              <button
                onClick={() => navigate('/term')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-900 text-white px-8 py-3.5 hover:bg-blue-800 transition-colors shadow-lg"
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