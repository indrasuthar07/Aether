export default function TerminalMockup() {
  return (
    <div className="max-w-3xl mx-auto rounded-xl overflow-hidden bg-aether-terminal shadow-2xl text-left font-mono border border-black/10">
      
      {/* Terminal Header */}
      <div className="flex items-center px-4 py-3 bg-black/20 border-b border-white/5">
        <div className="flex gap-2 w-16">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 text-center text-[11px] text-zinc-500 font-medium tracking-wide">
          aether — bash
        </div>
        <div className="w-16"></div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 sm:p-8 text-[14px] sm:text-[15px] leading-relaxed text-zinc-300 antialiased">
        
        {/* Command */}
        <div>
          <code className="font-mono text-zinc-500 mr-3">$</code>
          <code >aether share</code>
        </div>
        
        {/* Status */}
        <code className="font-mono mt-4">
          ◉ Aether agent running ...
        </code>
        
        {/* Simple Text Data */}
        <div className="mt-4">
          <code className="font-mono text-zinc-500">Host: </code>
          <code className="font-mono text-zinc-300">user@macbook-pro</code>
        </div>
        
        <div className="mt-1">
          <code className="font-mono text-zinc-500">Access: </code>
          <code className="font-mono text-zinc-300">Full Terminal</code>
        </div>

        <div className="mt-1">
          <code className="font-mono text-zinc-500">Code: </code>
          <code className="font-mono text-white font-bold tracking-widest">452-237</code>
        </div>
        
        <div className="font-mono mt-6flex items-center gap-2">
          <code>Awaiting peer connection... |</code>
        </div>

      </div>
    </div>
  );
}