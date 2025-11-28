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
import ActorDetails from './pages/ActorDetails';
import { Watchlist } from './pages/Watchlist';
import { Ratings } from './pages/Ratings';
import { Settings } from './pages/Settings';
import CineAdmin from './pages/admin/CineAdmin';
import { getUserTitle } from './utils/userTitles';

import SignInModal from './components/SignInModal';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const { user, realUser, viewAsSignedOut, toggleViewAsSignedOut, signInWithGoogle, logout } = useAuth();
  const { ratings } = useMovieContext();
  const titleInfo = getUserTitle(Object.keys(ratings).length);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
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

  const handleSignIn = async () => {
    await signInWithGoogle();
    setShowSignInModal(false);
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

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/cineadmin');

  return (
    <ToastProvider>
      <ScrollToTop />
      {/* Admin "View as Free User" Floating Control */}
      {viewAsSignedOut && realUser?.email === 'elbak89@gmail.com' && (
        <div className="fixed top-6 right-6 z-[2000] animate-fade-in-up">
          <button
            onClick={toggleViewAsSignedOut}
            className="w-14 h-14 rounded-full p-1 bg-gradient-to-r from-sky-500 to-purple-600 shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform group relative"
            title="Click to return to Admin view"
          >
            <img
              src={realUser.photoURL}
              alt="Admin"
              className="w-full h-full rounded-full border-2 border-white object-cover"
            />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900">
              <span className="text-[10px] font-bold text-white">A</span>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
              Return to Admin View
            </div>
          </button>
        </div>
      )}

      {isAdmin ? (
        <Routes>
          <Route path="/cineadmin/*" element={<CineAdmin />} />
        </Routes>
      ) : (
        <div className={`min-h-screen p-6 md:p-12 md:pt-32 max-w-7xl mx-auto pb-24 md:pb-12 ${viewAsSignedOut ? 'pt-16' : ''}`}>
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
                          {/* Super Admin Link - Only visible to admin */}
                          {realUser?.email === 'elbak89@gmail.com' && (
                            <>
                              <Link
                                to="/cineadmin"
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors"
                              >
                                <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                                  <span className="text-[10px] font-bold text-black">A</span>
                                </div>
                                Super Admin
                              </Link>

                              <button
                                onClick={() => {
                                  toggleViewAsSignedOut();
                                  setShowProfileMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-xl transition-colors text-left"
                              >
                                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center">
                                  <span className="text-[10px] font-bold text-slate-500">?</span>
                                </div>
                                View As Free User
                              </button>
                            </>
                          )}
                          <Link
                            to="/settings"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors"
                          >
                            <SettingsIcon size={16} className="text-sky-400" /> My Profile
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
                <button onClick={() => setShowSignInModal(true)} className="text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors px-4">
                  Sign In
                </button>
              )}
            </div>
          </header>

          <FloatingMenu onSignInClick={() => setShowSignInModal(true)} />

          <Routes>
            <Route path="/" element={<Home onSignInClick={() => setShowSignInModal(true)} />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/person/:id" element={<ActorDetails />} />
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

          {/* Sign In Modal */}
          <SignInModal
            isOpen={showSignInModal}
            onClose={() => setShowSignInModal(false)}
            onSignIn={handleSignIn}
          />
        </div>
      )}
    </ToastProvider>
  );
}

export default App;
