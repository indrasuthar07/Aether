type ConnectionStatus = 'connecting' | 'waiting' | 'live' | 'disconnected' | 'error';

interface StatusBarProps {
  status: ConnectionStatus;
  code: string;
  onDisconnect: () => void;
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; dotClass: string; label: string }> = {
  connecting: {
    color: 'bg-yellow-400',
    dotClass: '',
    label: 'Connecting...'
  },
  waiting: {
    color: 'bg-blue-400',
    dotClass: '',
    label: 'Waiting for agent...'
  },
  live: {
    color: 'bg-emerald-400',
    dotClass: 'animate-pulse-dot',
    label: 'Live'
  },
  disconnected: {
    color: 'bg-zinc-400',
    dotClass: '',
    label: 'Disconnected'
  },
  error: {
    color: 'bg-red-400',
    dotClass: '',
    label: 'Connection error'
  }
};

function StatusBar({ status, code, onDisconnect }: StatusBarProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center justify-between px-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
      {/* Left side: status indicator */}
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${config.color} ${config.dotClass}`}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-zinc-300">
          {config.label}
        </span>
      </div>

      {/* Right side: code badge + disconnect */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs font-mono font-semibold text-zinc-300 tracking-wider">
          {code.split('').join(' ')}
        </span>

        {status === 'live' && (
          <button
            onClick={onDisconnect}
            className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-400/50 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
export type { ConnectionStatus };
