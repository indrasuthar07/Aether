import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CodeInput from '../components/CodeInput';
import { isValidSessionCode } from '../types';
import { ArrowLeft, Shield, Zap, Activity, HelpCircle, ChevronDown, Loader2, Terminal, AlertCircle } from 'lucide-react';

function ConnectTerminal() {
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const validationWsRef = useRef<WebSocket | null>(null);

  const isComplete = code.length === 6;

  // Clear error when user changes the code
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (error) setError('');
  }, [error]);

  // Clean up any lingering validation WebSocket on unmount
  useEffect(() => {
    return () => {
      if (validationWsRef.current) {
        validationWsRef.current.close();
        validationWsRef.current = null;
      }
    };
  }, []);

  // Validates the session code against the signaling server before navigating
  const triggerConnectionSequence = useCallback(() => {
    if (!isValidSessionCode(code)) return;
    setIsConnecting(true);
    setError('');
    setLogs(['> Initializing Aether peer handshake...']);

    // Open a temporary WebSocket to validate the code exists
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setError('Unable to reach the signaling server. Please try again.');
      setIsConnecting(false);
      return;
    }
    validationWsRef.current = ws;

    let resolved = false;

    const cleanup = () => {
      resolved = true;
      if (validationWsRef.current === ws) {
        validationWsRef.current = null;
      }
      try { ws.close(); } catch { /* already closed */ }
    };

    // Timeout: if the server doesn't respond within 6 seconds, show an error
    const timeout = setTimeout(() => {
      if (resolved) return;
      cleanup();
      setError('Connection timed out. Please check your network and try again.');
      setIsConnecting(false);
    }, 6000);

    ws.addEventListener('open', () => {
      if (resolved) return;
      setLogs(prev => [...prev, '> Locating signaling server...']);
      // Send a join to check if the room exists
      ws.send(JSON.stringify({ type: 'join', payload: { code } }));
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      if (resolved) return;
      try {
        const data = JSON.parse(String(event.data));

        if (data.type === 'ready') {
          // Room exists! Close validation WS and navigate to the real terminal page
          clearTimeout(timeout);
          cleanup();
          setLogs(prev => [
            ...prev,
            '> Establishing direct WebRTC P2P tunnel...',
            '> Exchanging end-to-end E2EE keys...',
            '✓ Secure session verified. Redirecting...'
          ]);
          // Short delay so user sees the success message
          setTimeout(() => {
            navigate(`/term/${code}`);
          }, 400);
        } else if (data.type === 'not-found') {
          // Room doesn't exist — show error immediately
          clearTimeout(timeout);
          cleanup();
          setError(`No active session found for code ${code}. Please check with the host.`);
          setIsConnecting(false);
          setLogs([]);
        } else if (data.type === 'error') {
          clearTimeout(timeout);
          cleanup();
          const msg = (data.payload?.message as string) || 'Server error. Please try again.';
          setError(msg);
          setIsConnecting(false);
          setLogs([]);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('error', () => {
      if (resolved) return;
      clearTimeout(timeout);
      cleanup();
      setError('Unable to reach the signaling server. Please try again.');
      setIsConnecting(false);
      setLogs([]);
    });

    ws.addEventListener('close', () => {
      if (resolved) return;
      clearTimeout(timeout);
      resolved = true;
      if (validationWsRef.current === ws) {
        validationWsRef.current = null;
      }
      setError('Connection closed unexpectedly. Please try again.');
      setIsConnecting(false);
      setLogs([]);
    });
  }, [code, navigate]);

  const handleSubmit = useCallback(() => {
    if (isComplete && !isConnecting) {
      triggerConnectionSequence();
    }
  }, [isComplete, isConnecting, triggerConnectionSequence]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isComplete && !isConnecting) {
      handleSubmit();
    }
  }, [isComplete, isConnecting, handleSubmit]);

  return (
    <div className="min-h-screen font-sans antialiased bg-aether-bg flex flex-col relative selection:bg-blue-900 selection:text-white">
      
      <nav className="absolute top-0 left-0 w-full p-6 sm:p-8 flex justify-between items-center z-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-aether-ink/60 hover:text-blue-900 font-semibold text-sm transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Back to home
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 z-0">
        <div className="w-full max-w-[440px] bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-blue-900/5 border border-black/[0.04] relative overflow-hidden transition-all duration-300">
          

          <div className={`absolute top-0 left-0 w-full h-1.5 transition-all duration-500 bg-gradient-to-r from-blue-900 via-blue-600 to-blue-900 ${isConnecting ? 'animate-pulse scale-y-120' : 'opacity-80'}`} />

          {/* Conditional Screen Transition: Show input form OR dynamic connection terminal */}
          {!isConnecting ? (
            <div 
              className="animate-in fade-in zoom-in-95 duration-200"
              onKeyDown={handleKeyDown}
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-8 mt-2">
                <div className="w-14 h-14 rounded-2xl text-blue-900 flex items-center justify-center mb-6 shadow-inner">
                  <Activity size={28} strokeWidth={2.5} />
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-aether-ink mb-3">
                  Join a session
                </h1>
                <p className="text-[14px] sm:text-[15px] text-aether-ink/60 font-medium leading-relaxed px-2">
                  Enter the 6-digit session code generated by the host to lock into their environment.
                </p>
              </div>

              {/* Input Area */}
              <div className="flex justify-center mb-8">
                <CodeInput value={code} onChange={handleCodeChange} />
              </div>

              {/* Action Button */}
              <button
                onClick={handleSubmit}
                disabled={!isComplete}
                className={`
                  w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-[15px] transition-all duration-300 ease-out
                  ${isComplete
                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800 hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-black/5 text-aether-ink/30 cursor-not-allowed'
                  }
                `}
              >
                <Terminal size={18} strokeWidth={2.5} />
                Connect to Terminal
              </button>

              <div className="h-6 mt-3 flex items-center justify-center">
                {isComplete && !error && (
                  <p className="text-[13px] text-blue-900/60 font-semibold animate-pulse tracking-wide">
                    Press Enter to connect
                  </p>
                )}
              </div>

              {/* Inline Error Banner */}
              {error && (
                <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-red-700 font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Live Terminal Handshake Output Screen */
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-2">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
                  <Loader2 size={22} className="animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-aether-ink">Connecting to Session</h2>
                <p className="text-xs text-aether-ink/50 font-medium mt-1">Establishing secure WebRTC pipeline</p>
              </div>

              {/* Simulated Console Logs box */}
              <div className="bg-zinc-950 rounded-xl p-4 font-mono text-[12px] text-zinc-400 min-h-[140px] flex flex-col gap-1.5 shadow-inner border border-white/5 tracking-normal text-left">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`animate-in fade-in slide-in-from-left-1 duration-200 ${
                      log.startsWith('✓') ? 'text-emerald-400 font-semibold' : ''
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help Accordion */}
          {!isConnecting && (
            <div className="mt-4 border-t border-black/5 pt-4">
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between text-[13px] font-semibold text-aether-ink/50 hover:text-blue-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={14} />
                  Where do I find my code?
                </div>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-300 ${showHelp ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showHelp ? 'max-h-28 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-[13px] text-aether-ink/60 leading-relaxed bg-black/5 rounded-lg p-3">
                  Ask the host to execute <code className="font-mono font-semibold text-blue-900 px-1 rounded">aether share</code> inside their command line interface to generate an 6-digit encrypted authentication PIN.
                </p>
              </div>
            </div>
          )}

        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[13px] font-semibold text-aether-ink/50">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm">
            <Shield size={14} className="text-blue-900" />
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm">
            <Zap size={14} className="text-blue-900" />
            <span>Zero configuration</span>
          </div>
        </div>

      </main>
    </div>
  );
}

export default ConnectTerminal;