import React from 'react';
import { useMovieContext } from '../context/MovieContext';
import { MovieList } from '../components/MovieList';
import { GENRES } from '../utils/constants';

export const Ratings = () => {
    const { activeListId, setActiveListId } = useMovieContext();

    return (
        <main className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-8 pl-2 border-l-4 border-sky-500">Your Rankings</h1>

            {/* Genre Tabs */}
            <div className="flex justify-center md:justify-start gap-4 mb-12 overflow-x-auto py-10 px-4 scrollbar-hide">
                {GENRES.map((genre) => {
                    const Icon = genre.icon;
                    const isActive = activeListId === genre.id;
                    return (
                        <button
                            key={genre.id}
                            onClick={() => setActiveListId(genre.id)}
                            className={`
                flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-300 whitespace-nowrap border
                ${isActive
                                    ? 'bg-white text-slate-900 shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] border-transparent scale-105'
                                    : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-slate-800/60 hover:text-white hover:border-white/20'
                                }
              `}
                        >
                            <Icon size={20} className={isActive ? 'text-slate-900' : ''} />
                            {genre.label}
                        </button>
                    );
                })}
            </div>

            {/* Active List */}
            <div className="glass-panel rounded-3xl p-8 md:p-12 min-h-[600px] relative overflow-hidden">
                {/* Decorative background blob */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none mix-blend-screen" />

                <div className="flex flex-col md:flex-row justify-between items-end mb-12 relative z-10 border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-display text-4xl md:text-5xl font-bold text-white flex items-center gap-4">
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-purple-500 text-6xl font-black">#</span>
                            Top 10 {GENRES.find(g => g.id === activeListId)?.label} Movies
                        </h2>
                        <p className="text-slate-400 mt-3 text-lg font-light">Drag and drop to rank your favorites</p>
                    </div>
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-[0.2em] py-2 px-4 rounded-full bg-sky-500/5 border border-sky-500/20 mt-6 md:mt-0 shadow-[0_0_15px_-3px_rgba(56,189,248,0.1)]">
                        {activeListId.toUpperCase()} EDITION
                    </span>
                </div>

                <MovieList listId={activeListId} />
            </div>
        </main>
    );
};
