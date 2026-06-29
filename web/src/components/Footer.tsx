import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="bg-blue-900">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          <div>
            <div className="text-xl lowercase font-semibold text-white">aether</div>
            <p className="mt-2 text-sm text-white/60">Terminals, teleported.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/80">
            <a href="https://github.com/indrasuthar07/Aether" className="hover:text-white transition">GitHub</a>
            <Link to="/term" className="hover:text-white transition">Web Client</Link>
            <a href="#hero" className="hover:text-white transition">aether.sh</a>
          </div>
        </div>
        <div className="mt-2 pt-6 border-t border-white/10 text-center text-xs text-white/50">
          Crafted in the open, for terminals everywhere.
        </div>
      </div>
    </footer>
  );
}