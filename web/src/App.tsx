import Nav from "./components/Nav";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Cta from "./components/Cta";
import Footer from "./components/Footer";


function App() {
  return (
    <main className="min-h-screen bg-aether-bg text-aether-ink antialiased">
      <Nav />
      <Hero />
      <HowItWorks />
      <Cta />
      <Footer />
    </main>
  );
}
export default App;