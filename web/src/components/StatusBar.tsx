import { type ReactNode } from 'react';
import { Loader2, Clock, XCircle, AlertCircle, Power } from 'lucide-react';

export type ConnectionStatus = 'connecting' | 'waiting' | 'live' | 'disconnected' | 'error';

interface StatusBarProps {
  status: ConnectionStatus;
  code: string;
  onDisconnect: () => void;
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; icon: ReactNode; label: string }> = {
  connecting: {
    color: 'text-blue-600',
    icon: <Loader2 size={14} className="animate-spin" />,
    label: 'Connecting...'
  },
  waiting: {
    color: 'text-blue-900',
    icon: <Clock size={14} />,
    label: 'Waiting for host...'
  },
  live: {
    color: 'text-emerald-600',
    icon: (
      <span className="relative flex h-2.5 w-2.5 ml-0.5 mr-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </span>
    ),
    label: 'Active'
  },
  disconnected: {
    color: 'text-aether-ink/40',
    icon: <XCircle size={14} />,
    label: 'Disconnected'
  },
  error: {
    color: 'text-red-500',
    icon: <AlertCircle size={14} />,
    label: 'Connection Error'
  }
};

function StatusBar({ status, code, onDisconnect }: StatusBarProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 bg-black/80 backdrop-blur-md border-b border-white/30 shadow-sm font-sans antialiased">
      
      {/* Status Indicator */}
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center justify-center ${config.color}`}>
          {config.icon}
        </div>
        <span className="text-[13px] font-semibold text-white/80 tracking-wide">
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-4"> 
        {/* Sleek Code Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest hidden sm:inline-block">
            Session Code : {code}
          </span>
        </div>

        {/* Disconnect*/}
        {status === 'live' && (
          <div className="h-4 w-px bg-black/10 mx-1 hidden sm:block" />
        )}
        
        {status === 'live' && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-full text-white/80 hover:text-red-600 transition-colors"
          >
            <Power size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline-block">Disconnect</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default StatusBar;