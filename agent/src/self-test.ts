import { createAgentPeer } from './webrtc';
import { spawnPTY, getShell } from './pty';
import * as logger from './logger';

export async function runSelfTest(): Promise<boolean> {
  console.log('Running Aether CLI self-test...\n');
  let allPassed = true;

  // 1. WebRTC Test
  try {
    process.stdout.write('1. Testing WebRTC native module and peer connection... ');
    const peer = createAgentPeer({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const offer = await peer.createOffer();
    if (!offer || offer.type !== 'offer' || !offer.sdp || !offer.sdp.includes('v=0')) {
      throw new Error('Invalid SDP offer generated');
    }

    peer.close();
    console.log('PASS');
    logger.success('WebRTC initialized and SDP offer generated successfully');
  } catch (err: unknown) {
    console.log('FAIL');
    allPassed = false;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`WebRTC test failed: ${msg}`);
  }

  // 2. PTY and Shell Execution Test
  try {
    const shell = getShell();
    process.stdout.write(`2. Testing PTY shell spawning (${shell})... `);

    const token = `AETHER_TEST_OK_${Date.now()}`;
    const command = process.platform === 'win32'
      ? `Write-Output "${token}"\r\n`
      : `echo "${token}"\n`;

    await new Promise<void>((resolve, reject) => {
      let outputBuffer = '';
      let timer: NodeJS.Timeout | null = null;
      let ptyProcess: ReturnType<typeof spawnPTY> | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (ptyProcess) {
          try {
            ptyProcess.kill();
          } catch {
            // ignore kill errors
          }
        }
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`PTY test timed out after 10000ms. Received output: ${outputBuffer}`));
      }, 10000);

      try {
        ptyProcess = spawnPTY();
      } catch (e) {
        cleanup();
        return reject(e);
      }

      ptyProcess.onData((data: string) => {
        outputBuffer += data;
        if (outputBuffer.includes(token)) {
          cleanup();
          resolve();
        }
      });

      // Give the shell a moment to initialize before writing command
      setTimeout(() => {
        try {
          ptyProcess?.write(command);
        } catch (e) {
          cleanup();
          reject(e);
        }
      }, 300);
    });

    console.log('PASS');
    logger.success(`PTY spawned ${shell}, executed command, and verified output successfully`);
  } catch (err: unknown) {
    console.log('FAIL');
    allPassed = false;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`PTY test failed: ${msg}`);
  }

  console.log('');
  if (allPassed) {
    logger.success('All self-tests passed successfully!');
  } else {
    logger.error('Self-tests encountered failures.');
  }

  return allPassed;
}
