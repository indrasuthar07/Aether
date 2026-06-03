import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { connectDatabase } from './db.js';
import { healthRouter } from './routes/health';
import { config } from './config';
const app = express();

// Middleware
app.use(
  cors({
    origin: config.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use(healthRouter);

// HTTP + WebSocket Server
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  handleConnection(ws);
});

// Startup
async function start(): Promise<void> {
  // Connect to MongoDB (optional — server works without it)
  await connectDatabase();

  server.listen(config.PORT, () => {
  console.log({
    service: "aether-server",
    status: "running",
    port: config.PORT,
    http: `http://localhost:${config.PORT}`,
    ws: `ws://localhost:${config.PORT}`,
  });
});
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`\n[Server] ${signal} received — shutting down`);

  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });

  wss.close(() => {
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
