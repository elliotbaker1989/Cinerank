import React from 'react';
import { NavLink } from 'react-router-dom';
import { Film, List, Users, Trophy } from 'lucide-react';

const BottomNav = () => {
    const navItems = [
        { path: '/', label: 'Discover', icon: Film },
        { path: '/ratings', label: 'Rankings', icon: Trophy },
        { path: '/watchlist', label: 'Watchlist', icon: List },
        { path: '/friends', label: 'Friends', icon: Users },
    ];

    return (
        <nav className="fixed bottom-6 left-4 right-4 md:hidden z-50 animate-fade-in-up">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50 px-6 py-3 flex justify-between items-center max-w-sm mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 relative
                ${isActive
                                    ? 'text-white scale-110'
                                    : 'text-slate-500 hover:text-slate-300'
                                }
              `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`absolute inset-0 bg-white/10 rounded-full blur-lg transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                    <Icon size={22} strokeWidth={2.5} className="relative z-10" />
                                    {isActive && (
                                        <div className="absolute -bottom-1 w-1 h-1 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
