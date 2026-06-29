import { Routes, Route, Outlet } from 'react-router-dom'; 
import Home from './pages/Home';
import TerminalPage from './pages/TerminalPage';
import ConnectTerminal from './pages/ConnectTerminal';
import Nav from './components/Nav';
import Footer from './components/Footer';
import NotFound from './pages/NotFound';

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex-grow">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <main className="bg-aether-bg text-aether-ink antialiased">
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/term" element={<ConnectTerminal />} />
        </Route>

        <Route path="/term/:code" element={<TerminalPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}

export default App;