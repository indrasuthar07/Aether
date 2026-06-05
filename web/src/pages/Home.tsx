import { useState } from "react";
import { Check, Copy, Sparkles, Radio, Cable, Terminal, ArrowRight } from "lucide-react";
import TerminalMockup from "../components/TerminalMockup";
// Data 
const steps = [
  {
    icon: Sparkles,
    label: "STEP 01",
    title: "Summon the agent",
    desc: "One curl command installs the tiny Aether daemon.",
  },
  {
    icon: Radio,
    label: "STEP 02",
    title: "Broadcast a handshake",
    desc: "Type aether beam and get a code.",
  },
  {
    icon: Cable,
    label: "STEP 03",
    title: "Lock the channel",
    desc: "Connect securely via encrypted P2P.",
  },
];

// Components

export function Hero() {
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

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 sm:py-32">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-[11px] font-semibold tracking-[0.15em] text-aether-accent">HOW IT WORKS</p>
        <h2 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-aether-ink">
          Three moves. No middleman.
        </h2>
        <p className="mt-4 text-lg text-zinc-600 max-w-xl mx-auto">
          From install to a live shared session in less time than it takes to write the Slack message.
        </p>

        <div className="mt-16 grid sm:grid-cols-3 gap-8 sm:gap-6 text-left">
          {steps.map(({ icon: Icon, label, title, desc }) => (
            <div key={label}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-aether-soft text-aether-accent">
                <Icon size={22} />
              </div>
              <p className="mt-5 text-[11px] font-semibold tracking-[0.15em] text-zinc-500">{label}</p>
              <h3 className="mt-2 text-xl font-semibold text-aether-ink">{title}</h3>
              <p className="mt-2 text-zinc-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section id="cta" className="bg-aether-accent text-white">
      <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">Step into the aether.</h2>
        <p className="mt-5 text-lg text-white/85 max-w-xl mx-auto">
          Install once, beam forever. Your next pair-programming session is one command away.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#" className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-aether-accent font-medium px-6 py-3 hover:bg-white/95 transition">
            <Terminal size={18} />
            Launch web client
          </a>
          <a href="#" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 text-white font-medium px-6 py-3 hover:bg-white/10 transition">
            {/* <Github size={18} /> */}
            Star on GitHub
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

//  Main Page Export 

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Cta />
    </main>
  );
}