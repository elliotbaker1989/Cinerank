import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, List, Settings, LogOut, User, Search, Users, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMovieContext } from '../context/MovieContext';
import { getUserTitle } from '../utils/userTitles';

const FloatingMenu = () => {
    const { user, logout, signInWithGoogle } = useAuth();
    const { ratings } = useMovieContext();
    const location = useLocation();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const dropdownRef = useRef(null);

    // Calculate user title info
    const titleInfo = getUserTitle(Object.keys(ratings).length);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] hidden md:flex items-center gap-2 animate-fade-in-down w-full justify-center">
            {/* Main Glass Pill */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full py-3 px-8 shadow-2xl shadow-black/50 flex items-center justify-center gap-8 transition-all duration-300 hover:bg-black/50 hover:border-white/20 hover:shadow-sky-500/5 w-fit">

                {/* Logo */}
                <div className="text-2xl font-black text-white tracking-tighter leading-none text-glow-menu select-none text-display">
                    CineRank
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-white/10" />

                {/* Navigation Links */}
                <nav className="flex items-center gap-2">
                    <Link
                        to="/"
                        className={`
                            px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5
                            ${isActive('/')
                                ? 'bg-white/10 text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        <Home size={18} />
                        <span>Discover</span>
                    </Link>

                    <Link
                        to="/ratings"
                        className={`
                            px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5
                            ${isActive('/ratings')
                                ? 'bg-white/10 text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        <Trophy size={18} />
                        <span>Your Rankings</span>
                    </Link>

                    <Link
                        to="/watchlist"
                        className={`
                            px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5
                            ${isActive('/watchlist')
                                ? 'bg-white/10 text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        <List size={18} />
                        <span>Watchlist</span>
                    </Link>

                    <Link
                        to="/friends"
                        className={`
                            px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5
                            ${isActive('/friends')
                                ? 'bg-white/10 text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        <Users size={18} />
                        <span>Friends</span>
                    </Link>
                </nav>

                {/* Divider */}
                <div className="w-px h-8 bg-white/10" />

                {/* Profile Section */}
                {user ? (
                    <div className="relative shrink-0" ref={dropdownRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-white/5 transition-colors group"
                        >
                            <div className="text-right">
                                <p className="text-sm font-bold text-white leading-none group-hover:text-sky-400 transition-colors">
                                    {user.displayName}
                                </p>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${titleInfo.current.color}`}>
                                    {titleInfo.current.title}
                                </p>
                            </div>

                            <div className="relative shrink-0">
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName}
                                    className="w-9 h-9 rounded-full border-2 border-white/10 group-hover:border-sky-500/50 transition-colors object-cover"
                                />
                                {/* Level Badge */}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${titleInfo.current.bgColor} border-2 border-black flex items-center justify-center`}>
                                    <Star size={8} className="text-black fill-black" />
                                </div>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <div className="absolute right-0 top-full mt-4 w-64 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in origin-top-right z-[1001]">
                                <div className="p-2 space-y-1">
                                    <div className="px-4 py-3 border-b border-white/5 mb-1">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Level</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className={`text-sm font-bold ${titleInfo.current.color}`}>{titleInfo.current.title}</span>
                                            <span className="text-xs text-slate-500">{Object.keys(ratings).length} rated</span>
                                        </div>
                                        {/* Mini Progress Bar */}
                                        <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className={`h-full ${titleInfo.current.bgColor}`}
                                                style={{ width: `${titleInfo.progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Super Admin Link - Only visible to admin */}
                                    {user.email === 'elbak89@gmail.com' && (
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
                                    )}

                                    <Link
                                        to="/settings"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <Settings size={16} className="text-sky-400" /> Settings
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                                    >
                                        <LogOut size={16} /> Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={signInWithGoogle}
                        className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingMenu;
