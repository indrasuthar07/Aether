import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Terminal } from 'lucide-react';

function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-aether-bg font-sans antialiased flex flex-col items-center justify-center px-6">
      <div className="max-w-md mx-auto text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-900 mb-6">
          <Terminal size={28} strokeWidth={2.5} />
        </div>

        <p className="text-6xl font-bold tracking-[0.2em] text-blue-900 uppercase mb-4">
          Error 404
        </p>

        <p className="text-base sm:text-lg text-aether-ink/70 leading-relaxed font-medium mb-12">
          The page or terminal session you are looking for doesn&apos;t exist, has been moved, or you entered the wrong address.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-aether-ink/10 bg-transparent text-aether-ink font-bold px-8 py-3.5 hover:bg-aether-ink/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-900 text-white font-bold px-8 py-3.5 hover:bg-blue-800 transition-colors shadow-lg"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
        
      </div>
    </main>
  );
}

export default NotFound;