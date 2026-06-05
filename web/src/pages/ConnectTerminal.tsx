import {useState, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import CodeInput from '../components/CodeInput';

function ConnectTerminal() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const isComplete = code.length === 6;

  const handleSubmit = useCallback(() => {
    if (isComplete) {
      navigate(`/t/${code}`);
    }
    }, [code, isComplete, navigate]);

const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && isComplete) {
    handleSubmit();
  }
}, [isComplete, handleSubmit]);

return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {/* Glow effect behind hero */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Terminal icon */}
        <div className="mb-8 relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg
              className="w-8 h-8 text-zinc-950"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-4 leading-tight">
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Share your terminal
          </span>
          <br />
          <span className="text-white">instantly</span>
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-400 text-lg sm:text-xl text-center max-w-md mb-12">
          No install for viewers. Just a 6-digit code.
        </p>

        {/* Code input */}
        <div className="mb-6" onKeyDown={handleKeyDown}>
          <CodeInput onChange={setCode} />
        </div>

        {/* Connect button */}
        <button
          onClick={handleSubmit}
          disabled={!isComplete}
          className={`
            relative px-8 py-3 rounded-xl font-semibold text-base
            transition-all duration-200 ease-out
            ${isComplete
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-100'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }
          `}
        >
          {isComplete && (
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 hover:opacity-20 transition-opacity" />
          )}
          Connect
        </button>

        {/* Keyboard hint */}
        {isComplete && (
          <p className="mt-3 text-xs text-zinc-500 animate-pulse">
            Press Enter to connect
          </p>
        )}
      </main>

      {/* How it works */}
      <section className="px-4 pb-20">
        <h2 className="text-center text-xl font-semibold text-zinc-300 mb-10">
          How it works
        </h2>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="group relative rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm font-bold">
                1
              </span>
              <h3 className="font-semibold text-white">Install the agent</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-3">
              Install the Termlink CLI agent globally with npm.
            </p>
            <code className="block px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs font-mono">
              npm install -g termlink
            </code>
          </div>

          {/* Step 2 */}
          <div className="group relative rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-sm font-bold">
                2
              </span>
              <h3 className="font-semibold text-white">Run termlink</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-3">
              Start sharing your terminal session with one command.
            </p>
            <code className="block px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-cyan-400 text-xs font-mono">
              termlink
            </code>
          </div>

          {/* Step 3 */}
          <div className="group relative rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm font-bold">
                3
              </span>
              <h3 className="font-semibold text-white">Share the code</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-3">
              Your viewer opens{' '}
              <span className="text-emerald-400 font-medium">termlink.app</span>{' '}
              and enters the 6-digit code.
            </p>
            <div className="flex gap-1.5 justify-center">
              {['4', '2', '0', '1', '3', '7'].map((d, i) => (
                <span
                  key={i}
                  className="w-7 h-9 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-sm font-mono font-bold text-white"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pb-8 text-center">
        <p className="text-zinc-600 text-xs flex items-center justify-center gap-2">
          <span>Built with</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            WebRTC
          </span>
          <span>&</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
            </svg>
            xterm.js
          </span>
        </p>
      </footer>
    </div>
  );
}

export default ConnectTerminal;
