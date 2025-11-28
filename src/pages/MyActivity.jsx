import React, { useState, useEffect, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Activity, List, Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMovieContext } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateMovieUrl } from '../utils/seoUtils';

const MyActivity = () => {
    const { user } = useAuth();
    const { ratings, lists, watched } = useMovieContext();
    const navigate = useNavigate();

    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'double_up', 'up', 'down', 'ranked', 'watchlist', 'seen'
    const [visibleCount, setVisibleCount] = useState(20);
    const [loading, setLoading] = useState(true);

    // Simulate loading for smooth transition
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const { stats, sortedMovies } = useMemo(() => {
        if (!user) return { stats: {}, sortedMovies: [] };

        const movieMap = {};

        const initMovie = (id, title, poster) => {
            if (!movieMap[id]) {
                movieMap[id] = {
                    id, title, poster,
                    count: 0,
                    up: 0, doubleUp: 0, down: 0,
                    ranked: 0, watchlist: 0, seen: 0
                };
            }
        };

        // Process Ratings
        Object.entries(ratings).forEach(([movieId, rating]) => {
            // We need movie details. Since ratings is just ID->Rating, we might need to look up details.
            // However, lists usually have the details. If a movie is ONLY rated but not in any list, we might miss details.
            // For this MVP, we'll try to find details from lists. If not found, we might have missing title/poster.
            // Actually, MovieContext doesn't store movie details in 'ratings' state, just the value.
            // But 'lists' has full movie objects.
            // 'watched' has timestamps.

            // Wait, the previous AdminContributions used a global collection which had details.
            // Here we are using local state. 
            // We need a way to get movie details for rated-only movies.
            // Let's iterate through ALL lists to build a lookup map first.
        });

        // Build a lookup map of movie details from all available lists
        const movieDetailsMap = {};
        Object.values(lists).flat().forEach(movie => {
            movieDetailsMap[movie.id] = { title: movie.title, poster_path: movie.poster_path };
        });

        // We also need to handle the case where we don't have details.
        // For now, let's process what we can.

        // 1. Process Lists (Ranked & Watchlist)
        // Ranked (All-time)
        (lists['all-time'] || []).forEach(m => {
            initMovie(m.id, m.title, m.poster_path);
            movieMap[m.id].count++;
            movieMap[m.id].ranked++;
        });

        // Watchlist
        (lists['watchlist'] || []).forEach(m => {
            initMovie(m.id, m.title, m.poster_path);
            movieMap[m.id].count++;
            movieMap[m.id].watchlist++;
        });

        // 2. Process Ratings
        Object.entries(ratings).forEach(([movieId, rating]) => {
            const details = movieDetailsMap[movieId] || { title: 'Unknown Title', poster_path: null };
            initMovie(movieId, details.title, details.poster_path);

            // Only increment count if not already counted (e.g. if it was in a list, we already init'd)
            // But we want to count INTERACTIONS. Rating is an interaction.
            movieMap[movieId].count++;

            if (rating === 'up') movieMap[movieId].up++;
            else if (rating === 'double_up') movieMap[movieId].doubleUp++;
            else if (rating === 'down') movieMap[movieId].down++;
        });

        // 3. Process Watched
        Object.entries(watched).forEach(([movieId, timestamp]) => {
            const details = movieDetailsMap[movieId] || { title: 'Unknown Title', poster_path: null };
            initMovie(movieId, details.title, details.poster_path);
            movieMap[movieId].count++;
            movieMap[movieId].seen++;
        });

        // Calculate Stats
        let totalDoubleUp = 0;
        let totalUp = 0;
        let totalDown = 0;
        let totalRanked = 0;
        let totalWatchlist = 0;
        let totalSeen = 0;

        Object.values(movieMap).forEach(m => {
            totalDoubleUp += m.doubleUp;
            totalUp += m.up;
            totalDown += m.down;
            // For ranked/watchlist/seen, we count the MOVIES, not just interactions? 
            // AdminDashboard counted total items in collection.
            // Here, m.ranked is 1 if ranked.
            if (m.ranked > 0) totalRanked++;
            if (m.watchlist > 0) totalWatchlist++;
            if (m.seen > 0) totalSeen++;
        });

        const stats = {
            doubleUp: totalDoubleUp,
            up: totalUp,
            down: totalDown,
            ranked: totalRanked,
            watchlist: totalWatchlist,
            seen: totalSeen
        };

        // Filter and Sort
        let sorted = Object.values(movieMap);

        if (activeFilter === 'double_up') sorted = sorted.filter(m => m.doubleUp > 0);
        else if (activeFilter === 'up') sorted = sorted.filter(m => m.up > 0);
        else if (activeFilter === 'down') sorted = sorted.filter(m => m.down > 0);
        else if (activeFilter === 'ranked') sorted = sorted.filter(m => m.ranked > 0);
        else if (activeFilter === 'watchlist') sorted = sorted.filter(m => m.watchlist > 0);
        else if (activeFilter === 'seen') sorted = sorted.filter(m => m.seen > 0);

        // Sort by most recent interaction? We don't have timestamps for everything easily.
        // Default to most interactions for now, or just alphabetical?
        // Let's sort by interaction count then title.
        sorted.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

        return { stats, sortedMovies: sorted };

    }, [ratings, lists, watched, user, activeFilter]);

    // Infinite Scroll
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                setVisibleCount(prev => prev + 20);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Please Sign In</h2>
                <p className="text-slate-400">You need to be signed in to view your activity.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">My Activity</h1>
                <p className="text-slate-400 mt-1">Your personal engagement history</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-sky-500" size={40} />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {/* Double Thumbs Up */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'double_up' ? 'all' : 'double_up')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-4 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'double_up' ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                                        <div className="flex -space-x-1">
                                            <ThumbsUp size={12} className="rotate-[-15deg]" />
                                            <ThumbsUp size={12} className="rotate-[15deg]" />
                                        </div>
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Double Up</span>
                                </div>
                                <div className="text-2xl font-black text-white">{stats.doubleUp}</div>
                            </div>
                        </button>

                        {/* Thumbs Up */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'up' ? 'all' : 'up')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-4 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'up' ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/20 rounded-full blur-xl group-hover:bg-green-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400">
                                        <ThumbsUp size={14} />
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Thumbs Up</span>
                                </div>
                                <div className="text-2xl font-black text-white">{stats.up}</div>
                            </div>
                        </button>

                        {/* Thumbs Down */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'down' ? 'all' : 'down')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-4 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'down' ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400">
                                        <ThumbsDown size={14} />
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Thumbs Down</span>
                                </div>
                                <div className="text-2xl font-black text-white">{stats.down}</div>
                            </div>
                        </button>

                        {/* Ranked */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'ranked' ? 'all' : 'ranked')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-4 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'ranked' ? 'border-sky-500 shadow-lg shadow-sky-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-sky-500/20 rounded-full blur-xl group-hover:bg-sky-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-sky-500/20 rounded-lg text-sky-400">
                                        <List size={14} />
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ranked</span>
                                </div>
                                <div className="text-2xl font-black text-white">{stats.ranked}</div>
                            </div>
                        </button>

                        {/* Watchlist */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'watchlist' ? 'all' : 'watchlist')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-4 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'watchlist' ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                                        <Clock size={14} />
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Watchlist</span>
                                </div>
                                <div className="text-2xl font-black text-white">{stats.watchlist}</div>
                            </div>
                        </button>

                        {/* Seen */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'seen' ? 'all' : 'seen')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-4 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'seen' ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                                        <Eye size={14} />
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Seen</span>
                                </div>
                                <div className="text-2xl font-black text-white">{stats.seen}</div>
                            </div>
                        </button>
                    </div>

                    {/* Movie List */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-sky-500" size={24} />
                            {activeFilter === 'all' ? 'All Activity' :
                                activeFilter === 'double_up' ? 'Loved Movies' :
                                    activeFilter === 'up' ? 'Liked Movies' :
                                        activeFilter === 'down' ? 'Disliked Movies' :
                                            activeFilter === 'ranked' ? 'Ranked Movies' :
                                                activeFilter === 'watchlist' ? 'Watchlist' : 'Seen Movies'}
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {sortedMovies.length > 0 ? (
                                sortedMovies.slice(0, visibleCount).map((movie, index) => (
                                    <div
                                        key={movie.id}
                                        onClick={() => navigate(generateMovieUrl(movie.id, movie.title))}
                                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-6 group hover:bg-white/10 transition-colors w-full cursor-pointer"
                                    >
                                        {/* Poster */}
                                        <img
                                            src={movie.poster}
                                            alt={movie.title}
                                            className="w-12 h-18 rounded-md shadow-lg border border-white/10 shrink-0 object-cover"
                                        />

                                        {/* Title & Stats */}
                                        <div className="flex-grow flex items-center justify-between min-w-0 gap-4">
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-bold text-white truncate group-hover:text-sky-400 transition-colors">{movie.title}</h3>

                                                {/* Breakdown */}
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    {movie.doubleUp > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-purple-400 font-medium" title="Double Thumbs Up">
                                                            <div className="flex -space-x-0.5">
                                                                <ThumbsUp size={10} className="rotate-[-15deg]" />
                                                                <ThumbsUp size={10} className="rotate-[15deg]" />
                                                            </div>
                                                            <span>Loved</span>
                                                        </div>
                                                    )}
                                                    {movie.up > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-green-400 font-medium" title="Thumbs Up">
                                                            <ThumbsUp size={12} />
                                                            <span>Liked</span>
                                                        </div>
                                                    )}
                                                    {movie.down > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-red-400 font-medium" title="Thumbs Down">
                                                            <ThumbsDown size={12} />
                                                            <span>Disliked</span>
                                                        </div>
                                                    )}
                                                    {movie.ranked > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-sky-400 font-medium" title="Ranked">
                                                            <List size={12} />
                                                            <span>Ranked</span>
                                                        </div>
                                                    )}
                                                    {movie.watchlist > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-amber-400 font-medium" title="Watchlist">
                                                            <Clock size={12} />
                                                            <span>Watchlist</span>
                                                        </div>
                                                    )}
                                                    {movie.seen > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium" title="Seen">
                                                            <Eye size={12} />
                                                            <span>Seen</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                    <Activity className="mx-auto text-slate-600 mb-4" size={48} />
                                    <h3 className="text-xl font-bold text-white mb-2">No Activity Found</h3>
                                    <p className="text-slate-400">
                                        {activeFilter === 'all'
                                            ? "You haven't interacted with any movies yet."
                                            : "No movies found matching this filter."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {visibleCount < sortedMovies.length && (
                            <div className="text-center py-8 text-slate-500 text-sm animate-pulse">
                                Loading more...
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MyActivity;
