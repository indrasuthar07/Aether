import type { IPty } from 'node-pty';

// node-pty is a native module, require it at runtime to avoid bundling issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty') as typeof import('node-pty');

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

function getShell(): string {
  if (process.platform === 'win32') {
    return 'powershell.exe';
  }
  return process.env['SHELL'] || '/bin/bash';
}

export function spawnPTY(onData: (data: string) => void): IPty {
  const shell = getShell();

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd: process.env['HOME'] || process.env['USERPROFILE'] || process.cwd(),
    env: process.env as Record<string, string>,
  });

  ptyProcess.onData(onData);

  return ptyProcess;
}

export function resizePTY(ptyProcess: IPty, cols: number, rows: number): void {
  try {
    ptyProcess.resize(
      Math.max(1, Math.floor(cols)),
      Math.max(1, Math.floor(rows))
    );
  } catch {
    // Resize can fail if the PTY has been destroyed
  }
}
