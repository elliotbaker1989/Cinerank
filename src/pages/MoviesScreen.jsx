import React from 'react';
import { useMovieContext } from '../context/MovieContext';
import { MovieList } from '../components/MovieList';
import { SearchBar } from '../components/SearchBar';
import { Film, Zap, Smile, Heart, Rocket, Clapperboard } from 'lucide-react';

const GENRES = [
    { id: 'all-time', label: 'All-Time', icon: Film },
    { id: 'action', label: 'Action', icon: Zap },
    { id: 'comedy', label: 'Comedy', icon: Smile },
    { id: 'drama', label: 'Drama', icon: Heart },
    { id: 'scifi', label: 'Sci-Fi', icon: Rocket },
];

const MoviesScreen = () => {
    const { activeListId, setActiveListId } = useMovieContext();

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-purple-600 tracking-tighter drop-shadow-lg">
                        CineRank
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide">
                        Curate your cinematic universe
                    </p>
                </div>

                <div className="glass-panel p-1.5 rounded-full flex gap-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                        <Clapperboard className="text-white" size={20} />
                    </div>
                </div>
            </header>

            <main className="space-y-6">
                <SearchBar />

                {/* Genre Tabs */}
                <div className="flex justify-start gap-3 mb-6 overflow-x-auto pb-4 scrollbar-hide mask-linear-fade -mx-4 px-4 md:mx-0 md:px-0">
                    {GENRES.map((genre) => {
                        const Icon = genre.icon;
                        const isActive = activeListId === genre.id;
                        return (
                            <button
                                key={genre.id}
                                onClick={() => setActiveListId(genre.id)}
                                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap border
                  ${isActive
                                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 border-transparent scale-105'
                                        : 'bg-slate-800/40 text-slate-400 border-white/5 hover:bg-slate-800/80 hover:text-white hover:border-white/10'
                                    }
                `}
                            >
                                <Icon size={16} className={isActive ? 'animate-pulse' : ''} />
                                {genre.label}
                            </button>
                        );
                    })}
                </div>

                {/* Active List */}
                <div className="glass-panel rounded-2xl p-4 md:p-8 min-h-[500px] relative overflow-hidden">
                    {/* Decorative background blob */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 relative z-10 border-b border-white/5 pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span className="text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-purple-500 text-3xl">#</span>
                                Top 10 {GENRES.find(g => g.id === activeListId)?.label}
                            </h2>
                            <p className="text-slate-400 mt-1 text-xs">Drag and drop to rank your favorites</p>
                        </div>
                        <span className="text-[10px] font-bold text-sky-500/80 uppercase tracking-widest py-1 px-2 rounded-full bg-sky-500/10 border border-sky-500/20 mt-4 md:mt-0">
                            {activeListId.toUpperCase()} EDITION
                        </span>
                    </div>

                    <MovieList listId={activeListId} />
                </div>
            </main>
        </div>
    );
};

export default MoviesScreen;
