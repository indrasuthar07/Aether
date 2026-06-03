import { Sparkles, Radio, Cable } from "lucide-react";

export const steps = [
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
export default function HowItWorks() {
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