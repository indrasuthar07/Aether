<div align="center">

# Aether

****Aether** lets you share your terminal instantly across any network. By using direct peer-to-peer connections, it completely bypasses the headache of SSH keys, firewalls, and port forwarding so you can focus on collaborating**
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?style=flat-square&logo=webrtc&logoColor=white)](https://webrtc.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

[**Live Demo**](https://useaether.vercel.app) · [**Report Bug**](https://github.com/indrasuthar07/Aether/issues) · [**Request Feature**](https://github.com/indrasuthar07/Aether/issues)

</div>

## Overview

Aether is a frictionless, peer-to-peer terminal sharing tool. Instantly broadcast a live, interactive terminal session across any network using a simple 6-digit code. Designed for immediate collaboration, Aether entirely eliminates the need for user accounts, SSH key management, or complex firewall configurations.

```bash
$ aether share
```

```
A E T H E R                                                          
   Secure terminal sharing                                  

  >  Session code:   4 5 2 2 3 7
  >  Share URL:     https://aether.vercel.app/term/452237
  >  Give this code to anyone you want to share your terminal with.

     Connecting to signaling server...
  ✓  Connected to signaling server
  ✓  Waiting for viewer...
```

The viewer opens the link, enters the code, and gets a live interactive terminal - streamed directly from your machine over an encrypted peer-to-peer connection. The signaling server never touches your terminal data.

## How It Works

Aether uses **WebRTC DataChannels** to establish direct, peer-to-peer (P2P) connections for terminal streaming. This architecture ensures low latency and high security, as your terminal data never passes through a central server.

```
┌───────────────────────────────────────┐                                     ┌───────────────────────────────────────┐
│             HOST MACHINE              │                                     │             REMOTE BROWSER            │
│                                       │           1. WebSockets             │                                       │
│ ┌───────────────────────────────────┐ │      (Offer/Answer/ICE Relay)       │ ┌───────────────────────────────────┐ │
│ │         AETHER CLI AGENT          │ │           ┌───────────┐             │ │             WEB VIEWER            │ │
│ │ ┌─────────────┐   ┌─────────────┐ │ │           │ Signaling │             │ │ ┌─────────────┐   ┌─────────────┐ │ │
│ │ │ Session Mgr │   │ ws client   │◄├─┼──────────►│  Server   │◄────────────┼─┤ │ ws client   │   │ React 19 UI │ │ │
│ │ └─────────────┘   └─────────────┘ │ │           │(Express 5)│             │ │ └─────────────┘   └─────────────┘ │ │
│ │ ┌─────────────┐   ┌─────────────┐ │ │           └───────────┘             │ │ ┌─────────────┐   ┌─────────────┐ │ │
│ │ │ @roamhq/wrtc│   │ Env Sanitiz.│ │ │        (Never sees term data)       │ │ │ Native WebRTC │   │ xterm.js 6  │ │ │
│ │ └──────┬──────┘   └──────┬──────┘ │ │                                     │ │ └──────┬──────┘   └──────┬──────┘ │ │
│ └────────┼─────────────────┼────────┘ │                                     │ └────────┼─────────────────┼────────┘ │
│          │                 │          │          2. WebRTC (P2P)            │          │                 │          │
│          │                 ▼          │    Channel: "terminal" (E2EE)       │          │                 │          │
│          │          ┌─────────────┐   │◄═══════════════════════════════════►│          │                 │          │
│          └──────────┤ Local Shell │   │                                     │          └─────────────────┘          │
│ PTY I/O Binding     │ (node-pty)  │   │     Raw PTY Output ───────►         │        Terminal Render & Input        │
│                     └─────────────┘   │     ◄────── Keystrokes & Resizes    │                                       │
└───────────────────────────────────────┘                                     └───────────────────────────────────────┘
```

**Connection flow:**

1. **Agent** spawns a pseudo-terminal (PTY) and registers a 6-digit session code on the signaling server via WebSocket.
2. **Viewer** enters the code in the web app; the server confirms the session exists.
3. **Signaling server** relays the WebRTC offer → answer → ICE candidates between both peers.
4. **DataChannel opens** - terminal I/O flows directly peer-to-peer, end-to-end encrypted.
5. **Server steps aside** - it no longer participates in the session.

## Architecture

Aether is a monorepo structured as three npm workspaces:

| Workspace | Role                               | Key Technologies                     |
| --------- | ---------------------------------- | ------------------------------------ |
| `agent/`  | CLI tool that shares your terminal | Node.js,`node-pty`, `@roamhq/wrtc`   |
| `server/` | WebSocket signaling server         | Express 5,`ws`, MongoDB (optional)   |
| `web/`    | Browser-based terminal viewer      | React 19, xterm.js 6, Tailwind CSS 4 |
|

### Data Channel Protocol

Once the P2P connection is established, all communication uses a single reliable ordered DataChannel named `"terminal"`:

| Direction       | Payload                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Agent → Viewer | Raw PTY output (text + ANSI escape sequences)                                     |
| Viewer → Agent | Raw keystrokes,**or** `{ type: "resize", cols, rows }` for terminal resize events |

## Getting Started

### Prerequisites

* **Node.js ≥ 22** (includes npm ≥ 10)
* **Python & C++ build tools** (Required by`node-pty` native bindings`)
* **MongoDB** (Optional -server runs without it)

**Setting up build tools:**

```bash
# Windows
npm install --global windows-build-tools

# macOS
xcode-select --install

# Linux
sudo apt install build-essential python3
```

### Installation

```bash
# 1. Clone
git clone https://github.com/indrasuthar07/Aether.git
cd Aether

# 2. Install 
npm install

# 3. Configure 
cp .env.example .env
```

### Running Locally

**start each workspace individually:**

```bash
npm run dev:server   # Signaling server 
npm run dev:web      # Web app          
npm run dev:agent    # Agent CLI
```

## Usage

### Sharing a Terminal

Run the following on the machine you want to share:

```bash
aether share
```

Aether will:

1. Spawn your default shell (PowerShell on Windows, `bash`/`zsh` on macOS/Linux)
2. Register a unique 6-digit session code
3. Print a shareable link
4. Wait for a viewer to connect via WebRTC

### Viewing a Terminal

1. Open project URL
2. Click **"Open Web Terminal"**
3. Enter the 6-digit session code
4. Done - you're in a live, interactive session

### CLI Reference

```
Usage: aether [command]

Commands:
  share        Share your terminal (default command)
  help, -h     Show help information
  version, -v  Print the current version
```

---

## Project Structure

```
Aether/
├── agent/                          # CLI terminal-sharing agent
│   ├── src/
│   │   ├── index.ts                # Entry point & CLI parser
│   │   ├── session.ts              # Session orchestrator (core logic)
│   │   ├── signaling-client.ts     # WebSocket signaling client
│   │   ├── webrtc.ts               # WebRTC peer connection wrapper
│   │   ├── pty.ts                  # PTY spawn + environment sanitization
│   │   ├── config.ts               # Configuration with env overrides
│   │   ├── code.ts                 # 6-digit session code generator
│   │   └── logger.ts               # Colored CLI output
│   └── package.json
│
├── server/                         # WebSocket signaling server
│   ├── src/
│   │   ├── index.ts                # Express + WebSocket server setup
│   │   ├── signaling.ts            # Message handling & relay logic
│   │   ├── room.ts                 # Room lifecycle & management
│   │   ├── connection-manager.ts   # Per-IP & global connection limits
│   │   ├── rate-limiter.ts         # Sliding-window rate limiting
│   │   ├── validation.ts           # Payload whitelisting & size gates
│   │   ├── config.ts               # Server configuration
│   │   ├── logger.ts               # Structured JSON logging
│   │   ├── db.ts                   # MongoDB connection (optional)
│   │   ├── models/Session.ts       # Session schema (scaffolded)
│   │   └── routes/health.ts        # GET /health endpoint
│   └── package.json
│
├── web/                            # Browser-based terminal viewer
│   ├── src/
│   │   ├── App.tsx                 # Router & layout
│   │   ├── main.tsx                # React entry point
│   │   ├── types.ts                # Shared types & constants
│   │   ├── index.css               # Tailwind theme + xterm overrides
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Landing page
│   │   │   ├── ConnectTerminal.tsx # Session code entry
│   │   │   ├── TerminalPage.tsx    # Live terminal session
│   │   │   └── NotFound.tsx        # 404 page
│   │   ├── components/
│   │   │   ├── Nav.tsx             # Floating navigation bar
│   │   │   ├── Footer.tsx          # Page footer
│   │   │   ├── CodeInput.tsx       # 6-digit OTP-style input
│   │   │   ├── StatusBar.tsx       # Terminal session status bar
│   │   │   ├── TerminalMockup.tsx  # Decorative terminal (landing)
│   │   │   └── TerminalView.tsx    # xterm.js wrapper component
│   │   └── hooks/
│   │       ├── useSignaling.tsx    # WebSocket signaling hook
│   │       ├── useWebRTC.tsx       # WebRTC peer connection hook
│   │       └── useTerminal.tsx     # xterm.js lifecycle hook
│   └── package.json
│
├── .env.example                    # Environment variable template
├── package.json                    # Root workspace config
└── tsconfig.base.json              # Shared TypeScript configuration
```

## Security

Security is a first-class concern in Aether, not an afterthought.

### End-to-End Encryption

All terminal data is transmitted over **WebRTC DataChannels**, which mandate **DTLS encryption** - the same protocol underpinning HTTPS. The signaling server is architecturally incapable of reading terminal content; it only relays connection metadata during the handshake.

### Environment Sanitization

The agent scrubs **50+ patterns** of sensitive environment variables before spawning the PTY shell. Cleared patterns include:

> `AWS_*` · `AZURE_*` · `GCP_*` · `GITHUB_*` · `STRIPE_*` · `OPENAI_*` · `*_API_KEY` · `*_TOKEN` · `*_SECRET` · `*_PASSWORD` · `*_DATABASE_URL` · and more

Aether's own configuration variables are also excluded from the PTY environment.

### Server-Side Hardening

| Control            | Details                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Origin validation  | Browser clients must match`ALLOWED_ORIGINS`; CLI agents are exempt (no `Origin` header)   |
| Rate limiting      | Sliding-window per-IP limits - connections: 20/min, registrations: 5/min, joins: 15/min  |
| Connection caps    | Per-IP: 10 · Global: 500                                                                 |
| Payload validation | Whitelist-based key filtering with per-type size gates (offer/answer: 32 KB · ICE: 4 KB) |
| Message size limit | DataChannel messages capped at 4,096 bytes                                                |
| Room TTL           | Rooms auto-expire after 5 minutes of inactivity                                           |

### Session Isolation

- Each session has a unique 6-digit code (guessing is rate-limited)
- Only one viewer may connect per session at a time
- Agent disconnect immediately tears down the room and evicts any active viewer

---

### Tech Stack

* **Agent:**[Node.js 22+](https://nodejs.org), [node-pty](https://www.google.com/search?q=%5Bhttps://github.com/nicedoc/node-pty%5D(https://github.com/nicedoc/node-pty)) (terminal spawning), [@roamhq/wrtc](https://www.google.com/search?q=%5Bhttps://github.com/nicedoc/node-webrtc%5D(https://github.com/nicedoc/node-webrtc)) (WebRTC), [ws](https://www.google.com/search?q=%5Bhttps://github.com/websockets/ws%5D(https://github.com/websockets/ws)) (WebSockets), [nanoid](https://www.google.com/search?q=%5Bhttps://github.com/ai/nanoid%5D(https://github.com/ai/nanoid)).
* **Server:**[Express 5](https://expressjs.com), [ws](https://www.google.com/search?q=%5Bhttps://github.com/websockets/ws%5D(https://github.com/websockets/ws)) (WebSockets), [Mongoose](https://mongoosejs.com) .
* **Web:**[React 19](https://react.dev), [Vite 8](https://vite.dev), [xterm.js 6](https://www.google.com/search?q=%5Bhttps://xtermjs.org%5D(https://xtermjs.org)) (browser terminal), [Tailwind CSS 4](https://tailwindcss.com), [React Router 7](https://reactrouter.com), [Lucide React](https://lucide.dev).
* **Shared:**[TypeScript 5](https://www.typescriptlang.org), [WebRTC](https://webrtc.org) (P2P transport).

## Contributing

Contributions are welcome. Here's how to get involved:

1. **Fork** the repository
2. **Create a feature branch** : `git checkout -b feature/my-feature`
3. **Commit your changes** : `git commit -m "feat: describe what you did"`
4. **Push and open a Pull Request**

### Development Notes

- The monorepo uses **npm workspaces** - always run `npm install` from the root
- `npm run dev` starts the server and web app together via `concurrently`
- The agent must be started separately with `npm run dev:agent`
- TypeScript strict mode is enabled across all three workspaces
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) - `feat:`, `fix:`, `chore:`, `docs:`, etc.

---

<div align="center">

#### Built with care for terminals everywhere.

### [useaether.vercel.app](https://useaether.vercel.app) · [Issues](https://github.com/indrasuthar07/Aether/issues)

</div>

