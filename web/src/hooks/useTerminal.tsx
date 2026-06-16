import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

interface TerminalSize {
  cols: number;
  rows: number;
}

interface UseTerminalOptions {
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  write: (data: string) => void;
  fit: () => TerminalSize;
  terminal: Terminal | null;
}

export function useTerminal(options?: UseTerminalOptions): UseTerminalReturn {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onInputRef = useRef(options?.onInput);
  const onResizeRef = useRef(options?.onResize);

  // Keep callback refs up to date
  useEffect(() => {
    onInputRef.current = options?.onInput;
  }, [options?.onInput]);

  useEffect(() => {
    onResizeRef.current = options?.onResize;
  }, [options?.onResize]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        cursor: '#ffffff',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#34d39933'
      },
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true,
      convertEol: false
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);

    termRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Input handler
    const inputDisposable = terminal.onData((data: string) => {
      onInputRef.current?.(data);
    });

    // Resize handler
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      onResizeRef.current?.(cols, rows);
    });

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const containerEl = terminalRef.current;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          fitAddon.fit();
        } catch {
          // Terminal may have been disposed
        }
      }, 50);
    });
    resizeObserver.observe(containerEl);

    // Cascading fit strategy
    let disposed = false;
    const fitTimers: ReturnType<typeof setTimeout>[] = [];

    const safeFit = () => {
      if (disposed) return;
      try {
        fitAddon.fit();
      } catch {
        // Terminal may have been disposed
      }
    };

    // Stage 1: rAF — first possible paint
    const rafId = requestAnimationFrame(() => {
      safeFit();
      // Stage 2: double-rAF after browser has actually painted
      const raf2 = requestAnimationFrame(() => {
        safeFit();
      });
      fitTimers.push(raf2 as unknown as ReturnType<typeof setTimeout>);
    });

    // Stage 3-6: escalating timeouts to catch slow layouts, CSS
    for (const delay of [50, 150, 400, 800]) {
      fitTimers.push(setTimeout(safeFit, delay));
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      for (const t of fitTimers) {
        clearTimeout(t);
        cancelAnimationFrame(t as unknown as number);
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  const write = useCallback((data: string) => {
    termRef.current?.write(data);
  }, []);

  const fit = useCallback((): TerminalSize => {
    const fitAddon = fitAddonRef.current;
    const terminal = termRef.current;

    if (fitAddon && terminal) {
      try {
        fitAddon.fit();
      } catch {
        // Terminal may not be ready
      }
      return { cols: terminal.cols, rows: terminal.rows };
    }

    return { cols: 80, rows: 24 };
  }, []);

  return {
    terminalRef,
    write,
    fit,
    terminal: termRef.current
  };
}
