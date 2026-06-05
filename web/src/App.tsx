import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TerminalPage from './pages/TerminalPage';
import ConnectTerminal from './pages/ConnectTerminal';
import NotFound from './pages/NotFound';

function App() {
  return (
    <main className="min-h-screen bg-aether-bg text-aether-ink antialiased">
       <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/connect" element={<ConnectTerminal/>} />
      <Route path="/t/:code" element={<TerminalPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </main>
  );
}
export default App;