import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Calendar, Ticket, ThumbsUp, ThumbsDown, Eye, EyeOff, Trophy, Info } from 'lucide-react';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import { formatReleaseDate, isInCinema } from '../utils/dateUtils';
import { getMovieProviders } from '../services/api';
import { useAuth } from '../context/AuthContext';

import { generateMovieUrl } from '../utils/seoUtils';

export const PosterMovieCard = ({ movie, rank, rankList, userRating }) => {
    const navigate = useNavigate();
    const { addMovie, removeMovie, watched, toggleWatched, rateMovie, lists, ratings } = useMovieContext();
    const { showToast } = useToast();
    const { selectedProviders } = useAuth(); // Get user's subscriptions

    const [providers, setProviders] = React.useState(movie.providers || []);
    const [loadingProviders, setLoadingProviders] = React.useState(false);
    const [hasFetchedProviders, setHasFetchedProviders] = React.useState(!!movie.providers);

    const isWatched = !!watched[movie.id];
    const inWatchlist = lists?.watchlist?.some(m => m.id === movie.id);
    const currentRating = ratings[movie.id]; // Get current rating from context
    const [showRatingOptions, setShowRatingOptions] = useState(false);
    const ratingTimeoutRef = useRef(null);

    // Auto-hide rating options after 3 seconds of inactivity
    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (ratingTimeoutRef.current) clearTimeout(ratingTimeoutRef.current);
        };
    }, []);

    const handleRate = (e, rating) => {
        e.stopPropagation();

        // Check if we are removing the rating (toggling off)
        const isRemoving = currentRating === rating;

        if (isRemoving) {
            rateMovie(movie, null);
            showToast({
                message: 'Removed movie rating',
                type: 'info',
                icon: <Info size={18} className="text-sky-400" />
            });
            return;
        }

        rateMovie(movie, rating);

        const messages = {
            'double_up': 'You loved this movie!',
            'up': 'You liked this movie',
            'down': 'You disliked this movie'
        };

        const types = {
            'double_up': 'love',
            'up': 'like',
            'down': 'dislike'
        };

        showToast(messages[rating], types[rating]);
    };

    const handleMouseEnter = async () => {
        if (ratingTimeoutRef.current) clearTimeout(ratingTimeoutRef.current);

        if (!hasFetchedProviders && !loadingProviders) {
            setLoadingProviders(true);
            try {
                const fetchedProviders = await getMovieProviders(movie.id);
                setProviders(fetchedProviders);
                setHasFetchedProviders(true);
            } catch (error) {
                console.error("Failed to fetch providers", error);
            } finally {
                setLoadingProviders(false);
            }
        }
    };

    const handleMouseLeave = () => {
        if (showRatingOptions) {
            ratingTimeoutRef.current = setTimeout(() => {
                setShowRatingOptions(false);
            }, 500);
        }
    };

    // Process providers to highlight subscriptions
    const sortedProviders = React.useMemo(() => {
        if (!providers || providers.length === 0) return [];
        if (!selectedProviders || selectedProviders.length === 0) return providers;

        const userProviderIds = new Set(selectedProviders.map(p => p.provider_id));

        // Split into subscribed and others
        const subscribed = [];
        const others = [];

        providers.forEach(p => {
            if (userProviderIds.has(p.id)) {
                subscribed.push({ ...p, isSubscribed: true });
            } else {
                others.push(p);
            }
        });

        return [...subscribed, ...others];
    }, [providers, selectedProviders]);

    // Format list name (e.g., 'action-movies' -> 'Action')
    const formatListName = (name) => {
        if (!name) return '';
        if (name === 'all-time') return 'All Time';
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleMovieClick = () => {
        navigate(generateMovieUrl(movie.id, movie.title));
    };

    const handleAddToWatchlist = (e) => {
        e.stopPropagation();
        addMovie('watchlist', movie);
        showToast({
            message: `${movie.title} added to your Watchlist`,
            type: 'success',
            icon: <Clock size={18} className="text-amber-400" />
        });
    };

    const handleAddToRanking = (e) => {
        e.stopPropagation();
        const uniqueId = addMovie('all-time', movie);

        showToast({
            message: `Added "${movie.title}" to Rankings`,
            type: 'success',
            icon: <Trophy size={18} className="text-amber-400" />,
            action: {
                label: 'Undo',
                onClick: () => {
                    removeMovie('all-time', uniqueId);
                }
            }
        });
    };

    const handleToggleWatched = (e) => {
        e.stopPropagation();

        // If already watched but options are hidden, just show options
        if (isWatched && !showRatingOptions) {
            setShowRatingOptions(true);
            return;
        }

        toggleWatched(movie);
        const newState = !isWatched;

        // Always keep options open when toggling via the button
        setShowRatingOptions(true);

        showToast({
            message: `${movie.title} marked as ${newState ? 'Seen' : 'Not Seen'}`,
            type: newState ? 'success' : 'info',
            icon: newState ? <Eye size={18} className="text-green-400" /> : <EyeOff size={18} className="text-sky-400" />
        });
    };

    return (
        <div
            onClick={handleMovieClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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

            {/* Watched Badge (Top Right) - Optional visual indicator when not hovering */}
            {isWatched && (
                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20">
                    <Eye size={12} className="text-green-400" />
                </div>
            )}

            {/* Role Badges (Overlay) */}
            {movie.roles && movie.roles.length > 0 && (
                <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                    {movie.roles.includes('Producer') && (
                        <div className="w-5 h-5 rounded-md bg-purple-500/90 text-white flex items-center justify-center text-[10px] font-bold shadow-lg border border-white/20" title="Producer">P</div>
                    )}
                    {movie.roles.includes('Director') && (
                        <div className="w-5 h-5 rounded-md bg-red-500/90 text-white flex items-center justify-center text-[10px] font-bold shadow-lg border border-white/20" title="Director">D</div>
                    )}
                    {movie.roles.includes('Actor') && (
                        <div className="w-5 h-5 rounded-md bg-blue-500/90 text-white flex items-center justify-center text-[10px] font-bold shadow-lg border border-white/20" title="Actor">A</div>
                    )}
                </div>
            )}

            {/* Cinema Ticket Badge */}
            {isInCinema(movie.release_date) && (
                <div className={`absolute top-2 ${isWatched || (movie.roles && movie.roles.length > 0) ? 'right-8' : 'right-2'} z-10`}>
                    <div className="bg-amber-500/90 text-white p-1.5 rounded-full shadow-lg border border-white/20 backdrop-blur-md" title="In Cinema">
                        <Ticket size={12} fill="currentColor" className="text-white" />
                    </div>
                </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <h4 className="text-white font-bold text-sm line-clamp-2 mb-2 leading-tight">
                    {movie.title}
                </h4>

                {/* Watch Providers */}
                {(loadingProviders || sortedProviders.length > 0) && (
                    <div className="flex justify-center gap-2 mb-3 min-h-[24px]">
                        {loadingProviders ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        ) : (
                            <div className="flex justify-center gap-2">
                                {sortedProviders.slice(0, 4).map(provider => (
                                    <div key={provider.name} className={`relative group/provider transition-all duration-300 ${provider.isSubscribed ? 'z-10 scale-110' : ''}`}>
                                        <img
                                            src={provider.logo}
                                            alt={provider.name}
                                            className={`w-6 h-6 rounded-full border ${provider.isSubscribed ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-white/20'}`}
                                        />
                                        {/* Custom Tooltip */}
                                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl opacity-0 group-hover/provider:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap flex flex-col items-center justify-center">
                                            {provider.isSubscribed && (
                                                <span className="text-[8px] font-bold text-green-400 uppercase tracking-wider mb-0.5">On My Subscriptions</span>
                                            )}
                                            <span className="text-[10px] font-bold text-white leading-none">{provider.name}</span>
                                            {/* Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/90" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons Row */}
                <div
                    className="flex gap-2 mb-2 transition-all duration-300"
                    onMouseLeave={() => setShowRatingOptions(false)}
                >
                    {showRatingOptions ? (
                        <button
                            onClick={handleAddToRanking}
                            className="flex-none w-[34px] py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 backdrop-blur-sm border border-amber-500/50 hover:border-amber-500/80 overflow-hidden"
                            title="Add to Ranking"
                        >
                            <Trophy size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleAddToWatchlist}
                            className="flex-[3] py-2 bg-white/10 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-sky-500 overflow-hidden"
                            title="Add to Watchlist"
                        >
                            <Plus size={14} />
                            <span className="w-auto opacity-100">Watchlist</span>
                        </button>
                    )}

                    <div
                        className="flex-1 relative h-[34px] flex justify-end"
                    >
                        {/* Unified Seen/Rating Button */}
                        <div
                            onMouseEnter={() => setShowRatingOptions(true)}
                            className={`absolute right-0 top-0 bottom-0 flex items-center transition-all duration-300 backdrop-blur-md border overflow-hidden z-20 ${showRatingOptions
                                ? `w-full rounded-lg shadow-xl ${isWatched ? 'bg-green-950/90 border-green-500/50' : 'bg-white/10 border-white/20'}`
                                : `w-full rounded-lg border-white/10 ${isWatched ? 'bg-green-500/20 border-green-500/50' : 'bg-white/10'}`
                                }`}>

                            {/* Rating Options (Slide in) */}
                            <div className={`flex items-center gap-0.5 h-full transition-all duration-300 ${showRatingOptions ? 'w-auto opacity-100 px-1' : 'w-0 opacity-0 hidden'
                                }`}>
                                <button
                                    onClick={(e) => handleRate(e, 'double_up')}
                                    className={`p-1 rounded-md transition-colors hover:scale-110 flex items-center justify-center h-full ${currentRating === 'double_up' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400'} hover:bg-purple-500/20 hover:text-purple-400`}
                                    title="Double Thumbs Up"
                                >
                                    <div className="flex -space-x-1">
                                        <ThumbsUp size={10} fill="currentColor" />
                                        <ThumbsUp size={10} fill="currentColor" />
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => handleRate(e, 'up')}
                                    className={`p-1 rounded-md transition-colors hover:scale-110 flex items-center justify-center h-full ${currentRating === 'up' ? 'text-green-400 bg-green-500/20' : 'text-slate-400'} hover:bg-green-500/20 hover:text-green-400`}
                                    title="Thumbs Up"
                                >
                                    <ThumbsUp size={12} fill="currentColor" />
                                </button>
                                <button
                                    onClick={(e) => handleRate(e, 'down')}
                                    className={`p-1 rounded-md transition-colors hover:scale-110 flex items-center justify-center h-full ${currentRating === 'down' ? 'text-red-400 bg-red-500/20' : 'text-slate-400'} hover:bg-red-500/20 hover:text-red-400`}
                                    title="Thumbs Down"
                                >
                                    <ThumbsDown size={12} fill="currentColor" />
                                </button>
                                {/* Divider */}
                                <div className={`w-px h-4 mx-0.5 ${isWatched ? 'bg-green-500/30' : 'bg-white/10'}`} />
                            </div>

                            {/* Main Toggle Button */}
                            <button
                                onClick={handleToggleWatched}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300 ${showRatingOptions ? 'px-1' : 'w-full hover:bg-white/10'
                                    } ${isWatched ? 'text-green-400' : 'text-slate-300 hover:text-white'} ${inWatchlist
                                        ? 'bg-sky-500 text-white border-sky-500 opacity-100'
                                        : 'bg-white/10 text-white border-white/10 hover:bg-sky-500 hover:text-white opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'
                                    }`}
                            >
                                {isWatched ? <Eye size={16} /> : <EyeOff size={16} />}
                                <span className="text-[6px] uppercase font-bold leading-none tracking-wider w-auto opacity-100">
                                    {isWatched ? 'Seen' : 'Not Seen'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

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
