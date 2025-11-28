import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Calendar, Ticket, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import { formatReleaseDate, isInCinema } from '../utils/dateUtils';

export const PosterMovieCard = ({ movie, rank, rankList, userRating }) => {
    const navigate = useNavigate();
    const { addMovie } = useMovieContext();
    const { showToast } = useToast();

    // Format list name (e.g., 'action-movies' -> 'Action')
    const formatListName = (name) => {
        if (!name) return '';
        if (name === 'all-time') return 'All Time';
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleMovieClick = () => {
        navigate(`/movie/${movie.id}`);
    };

    const handleAddToWatchlist = (e) => {
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

    return (
        <div
            onClick={handleMovieClick}
            className="group relative w-full aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-sky-500/20 hover:z-20 border border-white/5 hover:border-sky-500/30"
        >
            <img
                src={movie.poster_path}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
            />

            {/* Rank Badge (If provided) */}
            {rank && (
                <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-600 text-black font-black text-sm rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/40 z-20 border-2 border-white/90">
                    #{rank}
                </div>
            )}

            {/* User Rating Badge (If provided) */}
            {userRating && (
                <div className="absolute top-2 left-2 z-20">
                    <div className={`p-1.5 rounded-lg backdrop-blur-md shadow-lg border border-white/20 ${userRating === 'double_up' ? 'bg-purple-500/90 text-white' :
                        userRating === 'up' ? 'bg-green-500/90 text-white' :
                            'bg-red-500/90 text-white'
                        }`}>
                        {userRating === 'double_up' && <div className="flex -space-x-1"><ThumbsUp size={12} fill="currentColor" /><ThumbsUp size={12} fill="currentColor" /></div>}
                        {userRating === 'up' && <ThumbsUp size={14} fill="currentColor" />}
                        {userRating === 'down' && <ThumbsDown size={14} fill="currentColor" />}
                    </div>
                </div>
            )}

            {/* Rating Badge (Always Visible) */}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-1 text-xs font-bold text-white shadow-lg z-10 group-hover:opacity-0 transition-opacity duration-300">
                <Star size={10} className="text-yellow-500" fill="currentColor" />
                {movie.vote_average?.toFixed(1)}
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
                            <div key={provider.name} className="relative group/provider">
                                <img
                                    src={provider.logo}
                                    alt={provider.name}
                                    className="w-6 h-6 rounded-full border border-white/20"
                                />
                                {/* Custom Tooltip */}
                                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl opacity-0 group-hover/provider:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white leading-none">{provider.name}</span>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/90" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleAddToWatchlist}
                    className="w-full py-2 bg-white/10 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all backdrop-blur-sm border border-white/10 hover:border-sky-500 mb-2"
                >
                    <Plus size={14} /> Watchlist
                </button>

                {/* Rank Detail on Hover */}
                {rank && (
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-400 font-bold mb-1">
                        <span>#{rank}</span>
                        <span className="opacity-80 font-normal">in {formatListName(rankList)}</span>
                    </div>
                )}

                {/* Rating in Overlay */}
                <div className="flex items-center justify-center gap-1 text-xs text-slate-300 font-medium">
                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                    <span>{movie.vote_average?.toFixed(1)} Rating</span>
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
    );
};
