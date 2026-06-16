import type { IPty } from 'node-pty';
import { connectSignaling } from './signaling-client';
import type { SignalingClient, SignalingMessage } from './signaling-client';
import { spawnPTY, resizePTY } from './pty';
import { createAgentPeer } from './webrtc';
import type { AgentPeer, RTCSessionDescriptionInit, RTCIceCandidateInit } from './webrtc';
import { config } from './config';
import * as logger from './logger';

// Types 
interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

function isResizeMessage(data: unknown): data is ResizeMessage {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj['type'] === 'resize' &&
    typeof obj['cols'] === 'number' &&
    typeof obj['rows'] === 'number'
  );
}

// Session state 
interface SessionState {
  signaling: SignalingClient | null;
  pty: IPty | null;
  peer: AgentPeer | null;
  isCleaningUp: boolean;
}

const state: SessionState = {
  signaling: null,
  pty: null,
  peer: null,
  isCleaningUp: false,
};

const MAX_BUFFER_SIZE = 100 * 1024; // 100KB
let ptyBuffer = '';

export function getSessionState(): Readonly<SessionState> {
  return state;
}

// Cleanup 
function cleanupPtyListener(): void {
  // Legacy function kept to avoid breaking references
}

export function cleanup(): void {
  if (state.isCleaningUp) return;
  state.isCleaningUp = true;
  cleanupPtyListener();

  if (state.peer) {
    try {
      state.peer.close();
    } catch {
      // ignore
    }
    state.peer = null;
  }

  if (state.pty) {
    try {
      state.pty.kill();
    } catch {
      // ignore
    }
    state.pty = null;
  }

  if (state.signaling) {
    try {
      state.signaling.close();
    } catch {
      // ignore
    }
    state.signaling = null;
  }

  state.isCleaningUp = false;
}

// Viewer connection setup 
function setupViewerConnection(code: string): void {
  if (!state.signaling || !state.pty) return;

  const signaling = state.signaling;
  const ptyProcess = state.pty;
  cleanupPtyListener();
  if (state.peer) {
    state.peer.close();
    state.peer = null;
  }

  logger.info('Viewer connected! Setting up WebRTC...');

  const peer = createAgentPeer({ iceServers: config.ICE_SERVERS });
  state.peer = peer;

  // Forward local ICE candidates to viewer via signaling
  peer.onIceCandidate((candidate) => {
    signaling.send('ice', { code, candidate });
  });

  // Wire up DataChannel events
  peer.setDataChannelEvents({
    onOpen: () => {
      logger.success('DataChannel open — terminal is now shared!');
      
      // Dirty node-pty's internal dimension cache. 
      resizePTY(ptyProcess, 81, 25, config.MAX_COLS, config.MAX_ROWS);

      // Send the buffered output to the new viewer so they see the prompt/history immediately
      if (ptyBuffer) {
        peer.sendData(ptyBuffer);
      }
    },

    onMessage: (data: string) => {
      // Size guard — reject oversized messages
      if (data.length > config.MAX_INPUT_SIZE) {
        logger.warn(`Rejected oversized input (${data.length} bytes)`);
        return;
      }
      // Check for resize commands (JSON-encoded)
      try {
        const parsed: unknown = JSON.parse(data);
        if (isResizeMessage(parsed)) {
          resizePTY(ptyProcess, parsed.cols, parsed.rows, config.MAX_COLS, config.MAX_ROWS);
          return;
        }
      } catch {
        // Not JSON — treat as raw terminal input
      }

      // Write raw input to PTY stdin
      ptyProcess.write(data);
    },

    onClose: () => {
      logger.warn('Viewer disconnected.');
      cleanupPtyListener();
      if (state.peer) {
        state.peer.close();
        state.peer = null;
      }
      logger.info('Waiting for a new viewer to connect...');
    },

    onError: (err: Error) => {
      logger.error(`DataChannel error: ${err.message}`);
    },
  });

  // Create and send WebRTC offer
  peer
    .createOffer()
    .then((offer) => {
      signaling.send('offer', { code, offer });
      logger.info('WebRTC offer sent, waiting for answer...');
    })
    .catch((err: Error) => {
      logger.error(`Failed to create offer: ${err.message}`);
    });
}

// Session entrypoint 
export async function startSession(code: string): Promise<void> {
  // 1. Connect to signaling server
  logger.info('Connecting to signaling server...');

  let signaling: SignalingClient;
  try {
    signaling = await connectSignaling();
    state.signaling = signaling;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Could not connect to signaling server: ${message}`);
    process.exit(1);
  }

  logger.success('Connected to signaling server');

  // 2. Register the session code
  signaling.send('register', { code });
  logger.success(`Session registered with code: ${code}`);

  // 3. Handle reconnects — re-register so the server knows us
  signaling.onReconnected(() => {
    signaling.send('register', { code });
    logger.success('Re-registered session after reconnect');
  });

  // 4. Handle permanent disconnect — clean up and exit
  signaling.onPermanentlyDisconnected(() => {
    logger.error('Permanently lost connection to signaling server');
    cleanup();
    process.exit(1);
  });

  // 5. Spawn PTY with exit detection
  const ptyProcess = spawnPTY((exitInfo) => {
    logger.warn(`Shell exited (code: ${exitInfo.exitCode})`);
    cleanup();
    process.exit(exitInfo.exitCode);
  });
  state.pty = ptyProcess;
  logger.success('Terminal spawned');

  // Buffer output permanently and send to peer if connected
  ptyProcess.onData((data: string) => {
    ptyBuffer += data;
    if (ptyBuffer.length > MAX_BUFFER_SIZE) {
      ptyBuffer = ptyBuffer.substring(ptyBuffer.length - MAX_BUFFER_SIZE);
    }
    if (state.peer && state.peer.isDataChannelOpen()) {
      state.peer.sendData(data);
    }
  });

  // 6. Handle signaling messages
  signaling.onMessage((message: SignalingMessage) => {
    switch (message.type) {
      case 'viewer-joined': {
        setupViewerConnection(code);
        break;
      }

      case 'answer': {
        const answer = message.payload['answer'] as RTCSessionDescriptionInit | undefined;
        if (!answer || !state.peer) {
          logger.warn('Received answer but no peer connection exists');
          return;
        }
        state.peer
          .setRemoteDescription(answer)
          .then(() => {
            logger.success('Remote description set');
          })
          .catch((err: Error) => {
            logger.error(`Failed to set remote description: ${err.message}`);
          });
        break;
      }

      case 'ice': {
        const candidate = message.payload['candidate'] as RTCIceCandidateInit | undefined;
        if (!candidate || !state.peer) return;
        state.peer.addIceCandidate(candidate).catch((err: Error) => {
          logger.warn(`Failed to add ICE candidate: ${err.message}`);
        });
        break;
      }

      case 'peer-disconnected': {
        logger.warn('Peer disconnected from signaling');
        cleanupPtyListener();
        if (state.peer) {
          state.peer.close();
          state.peer = null;
        }
        logger.info('Waiting for a new viewer to connect...');
        break;
      }

      case 'error': {
        const errorMsg = (message.payload['message'] as string) || 'Unknown signaling error';
        logger.error(`Signaling error: ${errorMsg}`);
        break;
      }

      default:
        break;
    }
  });

  logger.info('Waiting for a viewer to connect...');
}
