import { Check, Copy } from "lucide-react";
import { useState } from "react";
import TerminalMockup from "./TerminalMockup";

export default function Hero() {
  const [copied, setCopied] = useState(false);
  const cmd = "curl -fsSL aether.sh/install | sh";

  return (
    <section className="pt-36 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-aether-accent/25 bg-aether-soft px-4 py-1.5 text-[11px] font-semibold tracking-[0.15em] text-aether-accent">
          • MACOS • OPEN SOURCE • PEER-TO-PEER
        </span>

        <h1 className="mt-8 text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-aether-ink leading-[1.05]">
          Your terminal, beamed{" "}
          <span className="text-aether-accent italic font-serif">through the air.</span>
        </h1>

        <p className="mt-6 text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Aether opens an encrypted channel between two machines in a single command. Skip the SSH keys, the tunnels, and the firewall tickets — share a session with a six-character handshake.
        </p>

        <div className="mt-10 max-w-2xl mx-auto text-left">
          <p className="text-[11px] font-semibold tracking-[0.15em] text-zinc-500 mb-3">
            INSTALL VIA TERMINAL
          </p>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-aether-terminal px-5 py-4">
            <code className="font-mono text-sm sm:text-[15px] text-zinc-100 truncate">
              <span className="text-zinc-500">$</span> {cmd}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cmd);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 text-zinc-400 hover:text-white transition"
              aria-label="Copy command"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-700">
          {["End-to-end encrypted", "NAT traversal built-in", "Zero config", "Free & open source"].map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <Check size={16} className="text-aether-accent" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <TerminalMockup />
    </section>
  );
}