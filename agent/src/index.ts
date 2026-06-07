#!/usr/bin/env node
import { banner, printcode, info, error } from './logger';
import { createSessionCode } from './code';
import { startSession, cleanup } from './session';
import { config } from './config';

function getShareUrl(code: string): string {
  return `${config.WEB_URL}/${code}`;
}

function showHelp(): void {
  console.log('');
  console.log('  Usage: aether [command]');
  console.log('');
  console.log('  Commands:');
  console.log('    share     Share your terminal (default)');
  console.log('    help      Show this help message');
  console.log('    version   Show version');
  console.log('');
}

function showVersion(): void {
  console.log('  aether v1.0.0');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'share';

  switch (command) {
    case 'help':
    case '--help':
    case '-h': {
      showHelp();
      return;
    }

    case 'version':
    case '--version':
    case '-v': {
      showVersion();
      return;
    }

    case 'share':
    default: {
      // Print banner
      banner();

      // Generate 6-digit code
      const code = createSessionCode();

      // Display code and share URL
      info('Your session code:');
      printcode(code);
      info(`Share URL: ${getShareUrl(code)}`);
      info('Give this code to anyone you want to share your terminal with.');
      console.log('');

      // Start the session
      await startSession(code);
      break;
    }
  }
}

// Process lifecycle 
process.on('SIGINT', () => {
  console.log('');
  info('Shutting down...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (err: Error) => {
  error(`Uncaught exception: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  error(`Unhandled rejection: ${message}`);
  cleanup();
  process.exit(1);
});

// Run
main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  error(`Fatal error: ${message}`);
  cleanup();
  process.exit(1);
});
