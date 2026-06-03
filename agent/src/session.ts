import type { IPty } from 'node-pty';
import { connectSignaling } from './signaling-client';
import type { SignalingClient, SignalingMessage } from './signaling-client';
import { spawnPTY, resizePTY } from './pty';
import { createAgentPeer } from './webrtc';
import type { AgentPeer, RTCSessionDescriptionInit, RTCIceCandidateInit } from './webrtc';
import * as logger from './logger';

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

export function getSessionState(): Readonly<SessionState> {
  return state;
}

export function cleanup(): void {
  if (state.isCleaningUp) return;
  state.isCleaningUp = true;

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

function setupViewerConnection(code: string): void {
  if (!state.signaling || !state.pty) return;

  const signaling = state.signaling;
  const ptyProcess = state.pty;

  logger.info('Viewer connected! Setting up WebRTC...');

  const peer = createAgentPeer();
  state.peer = peer;

  // Send local ICE candidates to viewer via signaling
  peer.onIceCandidate((candidate) => {
    signaling.send('ice', { code, candidate });
  });

  // Wire up DataChannel events
  peer.setDataChannelEvents({
    onOpen: () => {
      logger.success('DataChannel open — terminal is now shared!');

      // Pipe PTY output → DataChannel
      ptyProcess.onData((data: string) => {
        try {
          if (peer.dataChannel.readyState === 'open') {
            peer.dataChannel.send(data);
          }
        } catch {
          // DataChannel may have closed mid-send
        }
      });
    },

    onMessage: (data: string) => {
      try {
        const parsed: unknown = JSON.parse(data);
        if (isResizeMessage(parsed)) {
          resizePTY(ptyProcess, parsed.cols, parsed.rows);
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

  // 3. Spawn PTY
  const ptyProcess = spawnPTY((_data: string) => {
    // Initial data handler — data is forwarded once DataChannel is open
    // This is a no-op until DataChannel wiring in setupViewerConnection
  });
  state.pty = ptyProcess;
  logger.success('Terminal spawned');

  // 4. Handle signaling messages
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
