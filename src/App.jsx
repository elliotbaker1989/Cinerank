import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, Settings as SettingsIcon, LogOut, User } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useMovieContext } from './context/MovieContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import BottomNav from './components/BottomNav';
import FloatingMenu from './components/FloatingMenu';
import { Home } from './pages/Home';
import { MovieDetails } from './pages/MovieDetails';
import { Watchlist } from './pages/Watchlist';
import { Ratings } from './pages/Ratings';
import { Settings } from './pages/Settings';
import CineAdmin from './pages/admin/CineAdmin';
import { getUserTitle } from './utils/userTitles';

function App() {
  const { user, signInWithGoogle, logout } = useAuth();
  const { ratings } = useMovieContext();
  const titleInfo = getUserTitle(Object.keys(ratings).length);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const handleLogoutClick = () => {
    setShowProfileMenu(false);
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const location = useLocation(); // Need to import useLocation
  const isAdmin = location.pathname.startsWith('/cineadmin');

  return (
    <ToastProvider>
      {isAdmin ? (
        <Routes>
          <Route path="/cineadmin/*" element={<CineAdmin />} />
        </Routes>
      ) : (
        <div className="min-h-screen p-6 md:p-12 md:pt-32 max-w-7xl mx-auto pb-24 md:pb-12">
          <header className="mb-16 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left relative md:hidden">
              <div className="absolute -left-20 -top-20 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none mix-blend-screen" />
              <h1 className="text-display text-7xl md:text-9xl font-black text-white tracking-tighter leading-none text-glow relative z-10">
                CineRank
              </h1>
              <p className="text-slate-400 text-xl mt-4 font-light tracking-widest uppercase pl-2">
                Curate your cinematic universe
              </p>
            </div>

            {/* Mobile Profile Menu (Hidden on Desktop) */}
            <div className="glass-panel p-2 rounded-full flex gap-2 items-center pr-6 relative z-[100] md:hidden">
              {user ? (
                <div className="flex items-center gap-6">
                  {/* Rated Count */}
                  <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-sm">{Object.keys(ratings).length}</span>
                  </div>

                  {/* User Info & Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white leading-none">{user.displayName}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${titleInfo.current.color}`}>
                          {titleInfo.current.title}
                        </p>
                      </div>
                      <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border-2 border-white/20" />
                    </button>

                    {/* Dropdown Menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in origin-top-right">
                        <div className="p-2 space-y-1">
                          <Link
                            to="/settings"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors"
                          >
                            <SettingsIcon size={16} className="text-sky-400" /> Settings
                          </Link>
                          <button
                            onClick={handleLogoutClick}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                          >
                            <LogOut size={16} /> Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={signInWithGoogle} className="text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors px-4">
                  Sign In
                </button>
              )}
            </div>
          </header>

          <FloatingMenu />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/watchlist" element={<Watchlist />} />
          </Routes>

          <BottomNav />

          {/* Logout Confirmation Dialog */}
          <ConfirmDialog
            isOpen={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            onConfirm={handleLogout}
            title="Sign Out"
            message="Are you sure you want to sign out?"
            confirmText="Sign Out"
            cancelText="Cancel"
            variant="danger"
          />
        </div>
      )}
    </ToastProvider>
  );
}

export default App;
