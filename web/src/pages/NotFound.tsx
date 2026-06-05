import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <h1 className="text-8xl sm:text-9xl font-bold mb-4">
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          404
        </span>
      </h1>
      <p className="text-xl text-zinc-400 mb-2">Page not found</p>
      <p className="text-sm text-zinc-500 mb-10">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link
        to="/"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-100"
      >
        Go Home
      </Link>
    </div>
  );
}

export default NotFound;