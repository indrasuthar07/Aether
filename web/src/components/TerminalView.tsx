import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTerminal } from '../hooks/useTerminal';

interface TerminalViewProps {
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

interface TerminalViewHandle {
  write: (data: string) => void;
  fit: () => void;
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ onInput, onResize }, ref) {
    const { terminalRef, write, fit } = useTerminal({
      onInput,
      onResize
    });

    useImperativeHandle(ref, () => ({
      write,
      fit: () => {
        const size = fit();
        if (size.cols > 0 && size.rows > 0) {
          onResize(size.cols, size.rows);
        }
      }
    }), [write, fit, onResize]);

    // Fit terminal after mount: cascade through multiple delays
    useEffect(() => {
      let cancelled = false;

      const doFit = () => {
        if (cancelled) return;
        const size = fit();
        if (size.cols > 0 && size.rows > 0) {
          onResize(size.cols, size.rows);
        }
      };

      const rafId = requestAnimationFrame(doFit);
      const timers = [100, 300, 600].map((ms) => setTimeout(doFit, ms));

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        timers.forEach(clearTimeout);
      };
    }, [fit, onResize]);

    return (
      <div
        ref={terminalRef}
        className="absolute inset-0"
        style={{ padding: '4px 8px' }}
      />
    );
  }
);

export default TerminalView;
export type { TerminalViewHandle };
