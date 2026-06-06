export default function Nav() {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl">
      <div className="flex items-center justify-between gap-2 rounded-full border border-black/10 bg-aether-bg/85 backdrop-blur-md pl-5 pr-2 py-2 shadow-sm">
        <a href="#" className="text-blue-900 font-semibold tracking-tight lowercase text-lg">
          aether
        </a>

        <div className="flex items-center gap-1">
          <a
            href="#how"
            className="hidden sm:inline-block text-sm text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-full transition"
          >
            How it works
          </a>

          <a
            href="#cta"
            className="text-sm font-medium text-white bg-blue-900 hover:opacity-90 transition px-4 py-2 rounded-full"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}