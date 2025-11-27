import { Routes, Route } from 'react-router-dom';
import { Clapperboard, Star } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useMovieContext } from './context/MovieContext';
import BottomNav from './components/BottomNav';
import { Home } from './pages/Home';
import { MovieDetails } from './pages/MovieDetails';

import { Watchlist } from './pages/Watchlist';

function App() {
  const { user, signInWithGoogle, logout } = useAuth();
  const { ratings } = useMovieContext();
  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto pb-24 md:pb-12">
      <header className="mb-16 flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="text-center md:text-left relative">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none mix-blend-screen" />
          <h1 className="text-display text-7xl md:text-9xl font-black text-white tracking-tighter leading-none text-glow relative z-10">
            CineRank
          </h1>
          <p className="text-slate-400 text-xl mt-4 font-light tracking-widest uppercase pl-2">
            Curate your cinematic universe
          </p>
        </div>

        <div className="glass-panel p-2 rounded-full flex gap-2 mb-4 items-center pr-6">
          {user ? (
            <div className="flex items-center gap-6">
              {/* Rated Count */}
              <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <Star size={16} fill="currentColor" />
                <span className="font-bold text-sm">{Object.keys(ratings).length}</span>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white leading-none">{user.displayName}</p>
                  <button onClick={logout} className="text-xs text-slate-400 hover:text-sky-400 transition-colors mt-1">
                    Sign Out
                  </button>
                </div>
                <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border-2 border-white/20" />
              </div>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors px-4">
              Sign In
            </button>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/watchlist" element={<Watchlist />} />
      </Routes>

      <BottomNav />
    </div>
  );
}

export default App;
