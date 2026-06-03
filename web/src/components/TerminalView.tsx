import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 15,
      theme: {
        background: '#050505',
        foreground: '#f5f5f5',
        cursor: '#ffffff',
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    
    termInstance.current = term;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    term.writeln('\x1b[1;32m[AETHER] Secure link established.\x1b[0m');
    term.writeln('Waiting for agent data stream...');

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-[#050505] p-4 flex justify-center items-center">
      <div ref={terminalRef} className="w-full h-full max-w-7xl border border-white/10 rounded-xl overflow-hidden shadow-2xl p-2 bg-[#0a0a0a]" />
    </div>
  );
}