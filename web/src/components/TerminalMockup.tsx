export default function TerminalMockup() {
    return (
    <div className="max-w-3xl mx-auto mt-16 rounded-xl overflow-hidden bg-aether-terminal shadow-2xl shadow-zinc-900/10 border border-zinc-900/10">
      <div className="flex items-center px-4 py-3 bg-zinc-800/60 border-b border-white/5 relative">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 text-xs text-zinc-400 font-medium">
          Terminal — zsh
        </span>
      </div>
      <div className="p-6 font-mono text-sm text-zinc-100 leading-relaxed">
        <div><span className="text-zinc-500">$</span> aether beam</div>
        <div className="mt-2 text-aether-accent">◉ Channel open · listening on the aether</div>
        <div className="mt-1 text-zinc-400">Host: <span className="text-zinc-100">MacBook-Pro</span></div>
        <div className="text-zinc-400">Handshake: <span className="text-zinc-100 tracking-wider">A7F-2QK</span></div>
        <div className="text-zinc-400">Expires in: <span className="text-zinc-100">10:00</span></div>
        <div className="mt-3 text-zinc-500">_</div>
      </div>
    </div>
  );
}