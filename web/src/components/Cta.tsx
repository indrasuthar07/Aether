import {Terminal, ArrowRight } from "lucide-react";

export default function Cta() {
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