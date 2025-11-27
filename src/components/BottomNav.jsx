import React from 'react';
import { NavLink } from 'react-router-dom';
import { Film, List, Users, User } from 'lucide-react';

const BottomNav = () => {
    const navItems = [
        { path: '/', label: 'Movies', icon: Film },
        { path: '/watchlist', label: 'Watchlist', icon: List },
        { path: '/friends', label: 'Friends', icon: Users },
        { path: '/account', label: 'Account', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-white/10 pb-safe pt-2 px-6 z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300
                ${isActive
                                    ? 'text-sky-400 scale-110'
                                    : 'text-slate-500 hover:text-slate-300'
                                }
              `}
                        >
                            <Icon size={24} strokeWidth={2.5} />
                            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
