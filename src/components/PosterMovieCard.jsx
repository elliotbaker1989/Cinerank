import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Calendar, Ticket, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import { formatReleaseDate, isInCinema } from '../utils/dateUtils';
import { getMovieProviders } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PosterMovieCard = ({ movie, rank, rankList, userRating }) => {
    const navigate = useNavigate();
    const { addMovie } = useMovieContext();
    const { showToast } = useToast();
    const { selectedProviders } = useAuth(); // Get user's subscriptions

    const [providers, setProviders] = React.useState(movie.providers || []);
    const [loadingProviders, setLoadingProviders] = React.useState(false);
    const [hasFetchedProviders, setHasFetchedProviders] = React.useState(!!movie.providers);

    const handleMouseEnter = async () => {
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
            onMouseEnter={handleMouseEnter}
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

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <h4 className="text-white font-bold text-sm line-clamp-2 mb-2 leading-tight">
                    {movie.title}
                </h4>

                {/* Watch Providers */}
                <div className="flex justify-center gap-2 mb-3 min-h-[24px]">
                    {loadingProviders ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    ) : (
                        sortedProviders.length > 0 && (
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
                        )
                    )}
                </div>

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
