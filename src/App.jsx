import { Routes, Route } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import BottomNav from './components/BottomNav';
import { Home } from './pages/Home';
import { MovieDetails } from './pages/MovieDetails';

function App() {
  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto pb-24 md:pb-12">
      <header className="mb-16 flex flex-col md:flex-row justify-start items-end gap-12">
        <div className="text-center md:text-left relative">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none mix-blend-screen" />
          <h1 className="text-display text-7xl md:text-9xl font-black text-white tracking-tighter leading-none text-glow relative z-10">
            CineRank
          </h1>
          <p className="text-slate-400 text-xl mt-4 font-light tracking-widest uppercase pl-2">
            Curate your cinematic universe
          </p>
        </div>

        <div className="glass-panel p-2 rounded-full flex gap-2 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 animate-pulse">
            <Clapperboard className="text-white" size={28} />
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
      </Routes>

      <BottomNav />
    </div>
  );
}

export default App;
