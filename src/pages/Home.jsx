import React, { useEffect, useState } from 'react';
import { useMovieContext } from '../context/MovieContext';
import { MovieList } from '../components/MovieList';
import { SearchBar } from '../components/SearchBar';
import { GENRES } from '../utils/constants';
import { getTrendingMovies } from '../services/api';
import { Plus } from 'lucide-react';

export const Home = () => {
    const { activeListId, setActiveListId, addMovie, lists } = useMovieContext();
    const [trendingMovies, setTrendingMovies] = useState([]);

    useEffect(() => {
        const fetchTrending = async () => {
            const movies = await getTrendingMovies();
            setTrendingMovies(movies);
        };
        fetchTrending();
    }, []);

    const activeList = lists[activeListId] || [];

    return (
        <main className="space-y-12">
            <SearchBar />

            {/* Genre Tabs */}
            <div className="flex justify-center md:justify-start gap-4 mb-12 overflow-x-auto pb-6 scrollbar-hide mask-linear-fade">
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

                {/* Trending Suggestions (Only if list is empty) */}
                {activeList.length === 0 && trendingMovies.length > 0 && (
                    <div className="mt-12 pt-12 border-t border-white/5">
                        <h3 className="text-2xl font-bold text-white mb-6">Trending Now</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {trendingMovies.slice(0, 5).map(movie => (
                                <div key={movie.id} className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer">
                                    <img
                                        src={movie.poster_path}
                                        alt={movie.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                        <h4 className="text-white font-bold text-sm line-clamp-2">{movie.title}</h4>
                                        <button
                                            onClick={() => addMovie(activeListId, movie)}
                                            className="mt-2 w-full py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};
