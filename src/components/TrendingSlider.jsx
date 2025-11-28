import React, { useEffect, useState } from 'react';
import { TrendingUp, Plus, ChevronRight, Star, Calendar, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTrendingMovies } from '../services/api';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';

import { useAuth } from '../context/AuthContext';
import { formatReleaseDate, isInCinema } from '../utils/dateUtils';

export const TrendingSlider = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { addMovie } = useMovieContext();
    const { showToast } = useToast();
    const { selectedRegion } = useAuth();

    useEffect(() => {
        const fetchTrending = async () => {
            setLoading(true);
            try {
                const data = await getTrendingMovies(selectedRegion);
                setMovies(data || []);
            } catch (error) {
                console.error("Failed to fetch trending movies:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrending();
    }, [selectedRegion]);

    const handleMovieClick = (movieId) => {
        navigate(`/ movie / ${movieId} `);
    };

    const handleAddToWatchlist = (e, movie) => {
        e.stopPropagation();
        addMovie('watchlist', movie);
        showToast({
            message: `Added "${movie.title}" to Watchlist`,
            type: 'success',
            action: {
                label: 'View',
                onClick: () => navigate('/watchlist')
            }
        });
    };

    if (loading || movies.length === 0) return null;

    return (
        <div className="w-full mb-12 animate-fade-in">
            <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="text-sky-400" size={24} />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                        Trending Now
                    </span>
                </h3>
                <button
                    onClick={() => navigate('/trending')} // Placeholder route, or could be a modal
                    className="group flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-sky-400 transition-colors"
                >
                    View All
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
            </div>

            <div className="relative group/slider">
                {/* Fade masks for scroll indication */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#020617] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#020617] to-transparent z-10 pointer-events-none" />

                <div className="flex gap-4 overflow-x-auto pb-6 px-4 scrollbar-hide mask-linear-fade snap-x snap-mandatory">
                    {movies.map((movie, index) => (
                        <div
                            key={movie.id}
                            onClick={() => handleMovieClick(movie.id)}
                            className="group relative flex-shrink-0 w-[160px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-sky-500/20 hover:z-20 snap-start border border-white/5 hover:border-sky-500/30"
                            style={{ animationDelay: `${index * 50} ms` }}
                        >
                            <img
                                src={movie.poster_path}
                                alt={movie.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                            />



                            {/* Rating Badge (Always Visible) */}
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-1 text-xs font-bold text-white shadow-lg z-10 group-hover:opacity-0 transition-opacity duration-300">
                                <Star size={10} className="text-yellow-500" fill="currentColor" />
                                {movie.vote_average.toFixed(1)}
                            </div>

                            {/* Coming Soon Badge (Always Visible if unreleased) */}
                            {formatReleaseDate(movie.release_date) && (
                                <div className="absolute top-2 right-2 w-8 h-8 bg-sky-500/80 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-lg z-10 group-hover:opacity-0 transition-opacity duration-300">
                                    <Calendar size={14} className="text-white" />
                                </div>
                            )}

                            {/* In Cinema Badge (Always Visible if in cinema) */}
                            {isInCinema(movie.release_date) && (
                                <div className="absolute top-2 right-2 w-8 h-8 bg-amber-500/80 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-lg z-10 group-hover:opacity-0 transition-opacity duration-300">
                                    <Ticket size={14} className="text-white" />
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                <h4 className="text-white font-bold text-sm line-clamp-2 mb-2 leading-tight">
                                    {movie.title}
                                </h4>

                                {/* Watch Providers */}
                                {movie.providers && movie.providers.length > 0 && (
                                    <div className="flex justify-center gap-2 mb-3">
                                        {movie.providers.map(provider => (
                                            <img
                                                key={provider.name}
                                                src={provider.logo}
                                                alt={provider.name}
                                                className="w-6 h-6 rounded-full border border-white/20"
                                                title={provider.name}
                                            />
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={(e) => handleAddToWatchlist(e, movie)}
                                    className="w-full py-2 bg-white/10 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all backdrop-blur-sm border border-white/10 hover:border-sky-500 mb-2"
                                >
                                    <Plus size={14} /> Watchlist
                                </button>

                                {/* Rating in Overlay */}
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-300 font-medium">
                                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                                    <span>{movie.vote_average.toFixed(1)} Rating</span>
                                </div>
                                {formatReleaseDate(movie.release_date) && (
                                    <div className="flex items-center justify-center gap-1.5 mt-2">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-sky-500/20 backdrop-blur-md border border-sky-500/30 rounded-lg">
                                            <Calendar size={10} className="text-sky-400" />
                                            <span className="text-[10px] font-bold text-sky-100">
                                                {formatReleaseDate(movie.release_date)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {isInCinema(movie.release_date) && (
                                    <div className="flex items-center justify-center gap-1.5 mt-2">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-lg">
                                            <Ticket size={10} className="text-amber-400" />
                                            <span className="text-[10px] font-bold text-amber-100">
                                                In Cinema
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
