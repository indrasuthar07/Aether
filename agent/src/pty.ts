
import type { IPty } from 'node-pty';
import { existsSync } from 'fs';

const pty = require('node-pty') as typeof import('node-pty');

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

// Environment sanitization
const SENSITIVE_PATTERNS = [
  'MONGO_URI',
  'DATABASE_URL',
  'REDIS_URL',
  'PRIVATE_KEY',
  'SESSION_SECRET',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'SERVER_URL',
  'WEB_URL',
];

const SENSITIVE_PREFIXES = [
  'AWS_',
  'AZURE_',
  'GCP_',
  'GOOGLE_CLOUD_',
  'GOOGLE_APPLICATION_',
  'FIREBASE_',
  'HEROKU_',
  'VERCEL_',
  'NETLIFY_',
  'DIGITALOCEAN_',
  'DO_',
  'DOCKER_',
  'K8S_',
  'KUBE_',
  'CI_',
  'GITHUB_',
  'GITLAB_',
  'BITBUCKET_',
  'NPM_TOKEN',
  'NODE_AUTH_',
  'SENTRY_',
  'DATADOG_',
  'DD_',
  'NEW_RELIC_',
  'TWILIO_',
  'SENDGRID_',
  'STRIPE_',
  'OPENAI_',
  'ANTHROPIC_',
  'GEMINI_',
  'HUGGINGFACE_',
  'SSH_AUTH_',
];

const SENSITIVE_SUFFIXES = [
  '_KEY',
  '_SECRET',
  '_TOKEN',
  '_PASSWORD',
  '_PASSWD',
  '_CREDENTIAL',
  '_CREDENTIALS',
  '_API_KEY',
  '_ACCESS_KEY',
  '_PRIVATE_KEY',
  '_CONNECTION_STRING',
  '_DSN',
];

function isSensitive(key: string): boolean {
  const upper = key.toUpperCase();

  for (const pattern of SENSITIVE_PATTERNS) {
    if (upper === pattern) return true;
  }

  for (const prefix of SENSITIVE_PREFIXES) {
    if (upper.startsWith(prefix)) return true;
  }

  for (const suffix of SENSITIVE_SUFFIXES) {
    if (upper.endsWith(suffix)) return true;
  }

  return false;
}

function sanitizeEnv(): Record<string, string> {
  const clean: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !isSensitive(key)) {
      clean[key] = value;
    }
  }

  if (!clean['TERM']) {
    clean['TERM'] = 'xterm-256color';
  }

  if (!clean['COLORTERM']) {
    clean['COLORTERM'] = 'truecolor';
  }

  if (process.platform !== 'win32' && !clean['LANG']) {
    clean['LANG'] = 'en_US.UTF-8';
  }

  return clean;
}

// Shell detection
export function getShell(): string {
  if (process.platform === 'win32') {
    // Windows: Use user-specified shell or default to PowerShell
    const winShell = process.env['AETHER_SHELL'] || process.env['SHELL'];

    if (winShell) {
      return winShell;
    }

    return 'powershell.exe';
  }

  // Explicit user override via AETHER_SHELL or standard SHELL
  const envShell = process.env['AETHER_SHELL'] || process.env['SHELL'];

  if (envShell && existsSync(envShell)) {
    return envShell;
  }

  // macOS: Prefer zsh, then bash, then sh
  if (process.platform === 'darwin') {
    for (const sh of ['/bin/zsh', '/bin/bash', '/bin/sh']) {
      if (existsSync(sh)) {
        return sh;
      }
    }
  }

  // Linux / Unix: Check standard shell locations
  for (const sh of ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/bin/sh']) {
    if (existsSync(sh)) {
      return sh;
    }
  }

  // Final fallback
  return envShell || 'sh';
}

// Public API
export interface PTYExitInfo {
  exitCode: number;
  signal?: number;
}

// Spawn a new PTY process.
export function spawnPTY(onExit?: (info: PTYExitInfo) => void): IPty {
  const shell = getShell();

  let cwd = process.env['HOME'] || process.env['USERPROFILE'] || process.cwd();

  try {
    if (!existsSync(cwd)) {
      cwd = process.cwd();
    }
  } catch {
    cwd = process.cwd();
  }

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd,
    env: sanitizeEnv(),
  });

  if (onExit) {
    ptyProcess.onExit((e) => {
      onExit({ exitCode: e.exitCode, signal: e.signal });
    });
  }

  return ptyProcess;
}

// Resize a PTY, clamping values to safe bounds.
export function resizePTY(
  ptyProcess: IPty,
  cols: number,
  rows: number,
  maxCols: number,
  maxRows: number,
): void {
  const safeCols = Math.max(1, Math.min(Math.floor(cols), maxCols));
  const safeRows = Math.max(1, Math.min(Math.floor(rows), maxRows));

  try {
    ptyProcess.resize(safeCols, safeRows);
  } catch {
    // Resize can fail if the PTY has already been destroyed
  }
}
