import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTerminal } from '../hooks/useTerminal';

interface TerminalViewProps {
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

interface TerminalViewHandle {
  write: (data: string) => void;
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ onInput, onResize }, ref) {
    const { terminalRef, write, fit } = useTerminal({
      onInput,
      onResize
    });

    useImperativeHandle(ref, () => ({
      write
    }), [write]);

    // Fit terminal after mount: use rAF to wait for paint, then fit.
    // A secondary delayed fit at 300ms catches edge cases where the
    // flex container hasn't fully settled on first navigation.
    useEffect(() => {
      let cancelled = false;

      const rafId = requestAnimationFrame(() => {
        if (cancelled) return;
        const size = fit();
        onResize(size.cols, size.rows);
      });

      const timer = setTimeout(() => {
        if (cancelled) return;
        const size = fit();
        onResize(size.cols, size.rows);
      }, 300);

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
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
