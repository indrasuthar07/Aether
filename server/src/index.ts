import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { connectDatabase } from './db';
import { healthRouter } from './routes/health';
import { config, validateConfig } from './config';
import { handleConnection } from './signaling';
import { ConnectionManager } from './connection-manager';
import { RateLimiter } from './rate-limiter';
import { createLogger } from './logger';

const log = createLogger('server');

// Express app

const app = express();

app.use(
  cors({
    origin: config.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  }),
);
app.use(express.json());
app.use(healthRouter);

// HTTP server 

const server = http.createServer(app);

// Security infrastructure

const connectionManager = new ConnectionManager({
  maxPerIp: config.MAX_CONNECTIONS_PER_IP,
  maxGlobal: config.MAX_GLOBAL_CONNECTIONS,
});

const connectionRateLimiter = new RateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_CONNECTIONS,
);

/**
 * Extract the client IP from an HTTP request.
 * Checks X-Forwarded-For first (for deployments behind a reverse
 * proxy / load balancer), then falls back to the raw socket address.
 */
function extractIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

// WebSocket server
const wsLog = createLogger('ws');

const wss = new WebSocketServer({
  server,
  maxPayload: config.MAX_PAYLOAD_BYTES,

  /**
   * Origin validation for browser-based connections.
   *
   * - Connections with no Origin header (Node.js agents) are allowed.
   * - Browser connections must come from a whitelisted origin.
   */
  verifyClient: (info, callback) => {
    const origin = info.origin;

    if (!origin) {
      callback(true);
      return;
    }

    // Browser clients must be from an allowed origin
    if (!config.ALLOWED_ORIGINS.includes(origin)) {
      wsLog.warn('Rejected connection from unauthorized origin', { origin });
      callback(false, 403, 'Forbidden: Origin not allowed');
      return;
    }

    callback(true);
  },
});

wss.on('connection', (ws, req) => {
  const ip = extractIp(req);

  // Gate 1: Per-IP connection frequency
  if (connectionRateLimiter.isRateLimited(ip)) {
    wsLog.warn('Connection rate limit exceeded', { ip });
    ws.close(1008, 'Rate limit exceeded');
    return;
  }

  // Gate 2: Concurrent connection capacity
  if (!connectionManager.canAccept(ip)) {
    wsLog.warn('Connection limit reached', {
      ip,
      perIp: connectionManager.getIpCount(ip),
      global: connectionManager.getGlobalCount(),
    });
    ws.close(1008, 'Too many connections');
    return;
  }

  // Track the accepted connection (auto-releases on close)
  connectionManager.track(ip, ws);
  
  // Hand off to signaling with the resolved IP for per-action rate limiting
  handleConnection(ws, ip);
});

// Startup 
async function start(): Promise<void> {
  // Fail fast on misconfiguration
  try {
    validateConfig(config);
  } catch (err) {
    log.error('Configuration validation failed', { error: err instanceof Error ? err : new Error(String(err)) });
    process.exit(1);
  }

  // Connect to MongoDB (server works without it)
  await connectDatabase();

  server.listen(config.PORT, () => {
    log.info('Server started', {
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
      maxRooms: config.MAX_ROOMS,
      maxConnectionsPerIp: config.MAX_CONNECTIONS_PER_IP,
      maxGlobalConnections: config.MAX_GLOBAL_CONNECTIONS,
      maxPayloadBytes: config.MAX_PAYLOAD_BYTES,
      allowedOrigins: config.ALLOWED_ORIGINS,
    });
  });
}

start().catch((err) => {
  log.error('Fatal startup error', { error: err instanceof Error ? err : new Error(String(err)) });
  process.exit(1);
});

// Graceful shutdown

function shutdown(signal: string): void {
  log.info('Shutdown signal received', { signal });

  // Close all WebSocket clients
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });

  wss.close(() => {
    server.close(() => {
      log.info('HTTP server closed');

      // Release rate-limiter timers so the process can exit cleanly
      connectionRateLimiter.destroy();

      process.exit(0);
    });
  });

  // Force exit after 5 seconds if graceful shutdown stalls
  setTimeout(() => {
    log.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
