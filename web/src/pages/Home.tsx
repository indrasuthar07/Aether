import React, { useState } from "react";
import { Check, Copy, Download, Icon, Share2, Terminal as TerminalIcon } from "lucide-react";
import TerminalMockup from "../components/TerminalMockup";

const Github = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// data
const steps = [
  {
    icon: Download,
    label: "STEP 01",
    title: "Deploy the agent",
    desc: "Execute a single command to install the lightweight Aether daemon. No dependencies or complex configs.",
  },
  {
    icon: Share2,
    label: "STEP 02",
    title: "Generate a token",
    desc: "Run 'aether beam' to instantly generate a secure, six-character authentication code.",
  },
  {
    icon: TerminalIcon,
    label: "STEP 03",
    title: "Establish connection",
    desc: "Your peer enters the code to instantly lock in a direct, end-to-end encrypted P2P session.",
  },
];

export function Hero() {
  const [copied, setCopied] = useState(false);
  const [selectedOS, setSelectedOS] = useState("Windows");

  const installCommands = {
    Windows: "iwr -useb aether.sh/install-win.ps1 | iex",
    macOS: "curl -fsSL aether.sh/install-mac | sh",
    Linux: "curl -fsSL aether.sh/install-linux | sh",
  };

  const cmd = installCommands[selectedOS]

  return (
    <section className="pt-40 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">

        {/* Headline */}
        <h1 className="mt-8 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-aether-ink leading-[1.05]">
          Access Your Terminal, <br className="hidden sm:block" />
          <span className="text-blue-900"> Anywhere.</span>
        </h1>

        {/* Description */}
        <p className="mt-6 text-base sm:text-lg text-aether-ink/70 max-w-3xl mx-auto leading-relaxed font-medium">
        Aether provides secure, instant access to your local terminal environment. Bypassing port forwarding entirely, it establishes an end-to-end encrypted connection through a simple 6-digit code. </p>

       {/* Command Box */}
        <div className="mt-12 max-w-xl mx-auto">
          <div className="rounded-xl overflow-hidden bg-aether-terminal shadow-xl border border-white/5">
            
            <div className="flex items-center gap-6 px-5 pt-4 pb-3">
              {Object.keys(installCommands).map((os) => (
                <button
                  key={os}
                  onClick={() => setSelectedOS(os)}
                  className={`text-[12px] font-semibold tracking-wide transition-colors ${
                    selectedOS === os
                      ? "text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {os}
                </button>
              ))}
            </div>

            {/* Code Block */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 bg-black/20 border-t border-white/5">
              <code className="font-mono text-[14px] sm:text-[15px] text-aether-soft truncate flex-1 text-left">
                <span className="text-white pr-3 select-none">
                  {selectedOS === "Windows" ? ">" : "$"}
                </span>
                {cmd}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cmd);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 flex items-center justify-center p-2 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                aria-label="Copy command"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] font-semibold ">
          {["Peer-to-peer", "Encrypted", "Zero config", "Free forever"].map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <Check size={14} className="text-blue-900 stroke-[3]" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <TerminalMockup />
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 sm:py-32">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-[11px] font-bold tracking-[0.2em] text-aether-ink/50 uppercase">
          HOW IT WORKS
        </p>
        <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-aether-ink">
          Three steps. Zero configuration.
        </h2>
        <p className="mt-4 text-lg text-aether-ink/70 font-medium">
          No complex network setup. Go from installation to a live, shared session instantly.
        </p>

        <div className="mt-20 grid sm:grid-cols-3 gap-12 sm:gap-8">
          {steps.map(({ icon: Icon, label, title, desc }) => (
            <div key={label} className="flex flex-col items-center text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-aether-accent">
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <p className="mt-6 text-[11px] font-bold tracking-[0.2em] text-aether-ink/50 uppercase">
                {label}
              </p>
              <h3 className="mt-2 text-xl font-bold text-aether-ink">{title}</h3>
              <p className="mt-3 text-[15px] text-aether-ink/70 leading-relaxed max-w-[260px]">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section id="cta" className="bg-blue-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
        <h2 className="text-4xl sm:text-[44px] font-bold tracking-tight">
          Ready to share your terminal?
        </h2>
        <p className="mt-6 text-[17px] text-white/70 max-w-xl mx-auto font-medium">
          Install the agent, get a code, and connect - all in under 30 seconds.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/term"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-white text-aether-footer font-bold px-8 py-3.5 hover:bg-zinc-50 transition-colors shadow-lg gap-2"
          >
            <TerminalIcon className="w-5 h-5" />
            Open Web Terminal
          </a>
          <a
            href="https://github.com/indrasuthar07/Aether"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 text-white font-bold px-8 py-3.5 hover:bg-white/10 transition-colors gap-2"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="relative font-sans antialiased text-aether-ink bg-aether-bg overflow-x-hidden min-h-screen">
      <Hero />
      <HowItWorks />
      <Cta />
    </main>
  );
}