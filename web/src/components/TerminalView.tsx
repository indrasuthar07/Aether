import { useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
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

    // Fit terminal after it mounts and send initial size
    const doInitialFit = useCallback(() => {
      const size = fit();
      onResize(size.cols, size.rows);
    }, [fit, onResize]);

    useEffect(() => {
      // Small delay to let the DOM settle before fitting
      const timer = setTimeout(doInitialFit, 100);
      return () => clearTimeout(timer);
    }, [doInitialFit]);

    return (
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{ padding: '4px 8px' }}
      />
    );
  }
);

export default TerminalView;
export type { TerminalViewHandle };
