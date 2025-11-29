import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ThumbsUp, ThumbsDown, Activity, Calendar, Loader2, List, Clock, Eye } from 'lucide-react';

const AdminContributions = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        thumbsUp: 0,
        doubleThumbsUp: 0,
        thumbsDown: 0,
        ranked: 0,
        watchlist: 0,
        total: 0
    });
    const [mostRated, setMostRated] = useState(null);
    const [timeframe, setTimeframe] = useState('week'); // 'week', 'month', 'year', 'all'
    const [customDate, setCustomDate] = useState('');
    const [sortedMovies, setSortedMovies] = useState([]);
    const [visibleCount, setVisibleCount] = useState(20);

    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'double_up', 'up', 'down', 'ranked', 'watchlist', 'seen'

    const [allRatings, setAllRatings] = useState([]);
    const [allRankings, setAllRankings] = useState([]);
    const [allWatchlists, setAllWatchlists] = useState([]);
    const [allWatched, setAllWatched] = useState([]);

    // 1. Real-time listener for ALL data
    useEffect(() => {
        setLoading(true);

        const unsubRatings = onSnapshot(query(collection(db, 'ratings')), (snap) => {
            const data = [];
            snap.forEach(doc => data.push(doc.data()));
            setAllRatings(data);
        });

        const unsubRankings = onSnapshot(query(collection(db, 'rankings')), (snap) => {
            const data = [];
            snap.forEach(doc => data.push(doc.data()));
            setAllRankings(data);
        });

        const unsubWatchlists = onSnapshot(query(collection(db, 'watchlists')), (snap) => {
            const data = [];
            snap.forEach(doc => data.push(doc.data()));
            setAllWatchlists(data);
        });

        const unsubWatched = onSnapshot(query(collection(db, 'watched')), (snap) => {
            const data = [];
            snap.forEach(doc => data.push(doc.data()));
            setAllWatched(data);
        });

        // Simple loading state management - ideally wait for all 3
        // For now, we'll just set loading false after a short timeout or when data comes in
        // A better way is Promise.all but with onSnapshot it's different.
        // We'll just assume if we have listeners attached, we are "loading" until first data comes.
        // Let's just set loading false after a moment or when any data updates, 
        // but to prevent flashing we can use a counter or just wait for all 3 to fire once?
        // Simplest for now:
        const timer = setTimeout(() => setLoading(false), 1000);

        return () => {
            unsubRatings();
            unsubRankings();
            unsubWatchlists();
            unsubWatched();
            clearTimeout(timer);
        };
    }, []);

    // 2. Calculate Stats whenever data, filters, or active metric changes
    useEffect(() => {
        calculateStats();
    }, [allRatings, allRankings, allWatchlists, allWatched, timeframe, customDate, activeFilter]);

    const calculateStats = () => {
        // Date Logic
        const now = new Date();
        let startDate = new Date();

        if (timeframe === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (timeframe === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        } else if (timeframe === 'year') {
            startDate.setFullYear(now.getFullYear() - 1);
        } else if (timeframe === 'custom' && customDate) {
            startDate = new Date(customDate);
        } else {
            startDate = null; // All time
        }

        const filterByDate = (item) => {
            if (!startDate) return true;
            return new Date(item.timestamp) >= startDate;
        };

        // Filter Data
        const filteredRatings = allRatings.filter(r => r.rating !== null && filterByDate(r));
        const filteredRankings = allRankings.filter(filterByDate);
        const filteredWatchlists = allWatchlists.filter(filterByDate);
        const filteredWatched = allWatched.filter(filterByDate);

        // Calculate Stats
        let up = 0;
        let doubleUp = 0;
        let down = 0;
        const movieCounts = {};

        // Helper to init movie entry
        const initMovie = (id, title, poster) => {
            if (!movieCounts[id]) {
                movieCounts[id] = {
                    id, title, poster,
                    count: 0, // Total interactions
                    up: 0, doubleUp: 0, down: 0,
                    ranked: 0, watchlist: 0, seen: 0
                };
            }
        };

        // Process Ratings
        filteredRatings.forEach(r => {
            if (r.rating === 'up') up++;
            else if (r.rating === 'double_up') doubleUp++;
            else if (r.rating === 'down') down++;

            initMovie(r.movieId, r.movieTitle, r.posterPath);
            movieCounts[r.movieId].count++;
            if (r.rating === 'up') movieCounts[r.movieId].up++;
            else if (r.rating === 'double_up') movieCounts[r.movieId].doubleUp++;
            else if (r.rating === 'down') movieCounts[r.movieId].down++;
        });

        // Process Rankings
        filteredRankings.forEach(r => {
            initMovie(r.movieId, r.movieTitle, r.posterPath);
            movieCounts[r.movieId].count++;
            movieCounts[r.movieId].ranked++;
        });

        // Process Watchlists
        filteredWatchlists.forEach(r => {
            initMovie(r.movieId, r.movieTitle, r.posterPath);
            movieCounts[r.movieId].count++;
            movieCounts[r.movieId].watchlist++;
        });

        // Process Watched (Seen)
        filteredWatched.forEach(r => {
            initMovie(r.movieId, r.movieTitle, r.posterPath);
            movieCounts[r.movieId].count++;
            movieCounts[r.movieId].seen++;
        });

        setStats({
            thumbsUp: up,
            doubleThumbsUp: doubleUp,
            thumbsDown: down,
            ranked: filteredRankings.length,
            watchlist: filteredWatchlists.length,
            seen: filteredWatched.length,
            total: filteredRatings.length + filteredRankings.length + filteredWatchlists.length + filteredWatched.length
        });

        // Find Most Rated (Top 1)
        let topMovie = null;

        // Convert to array
        let sorted = Object.values(movieCounts);

        // Filter based on active metric (Hide items with 0 count for the selected filter)
        if (activeFilter === 'double_up') sorted = sorted.filter(m => m.doubleUp > 0);
        else if (activeFilter === 'up') sorted = sorted.filter(m => m.up > 0);
        else if (activeFilter === 'down') sorted = sorted.filter(m => m.down > 0);
        else if (activeFilter === 'ranked') sorted = sorted.filter(m => m.ranked > 0);
        else if (activeFilter === 'watchlist') sorted = sorted.filter(m => m.watchlist > 0);
        else if (activeFilter === 'seen') sorted = sorted.filter(m => m.seen > 0);

        // Sort
        sorted.sort((a, b) => {
            if (activeFilter === 'double_up') return b.doubleUp - a.doubleUp;
            if (activeFilter === 'up') return b.up - a.up;
            if (activeFilter === 'down') return b.down - a.down;
            if (activeFilter === 'ranked') return b.ranked - a.ranked;
            if (activeFilter === 'watchlist') return b.watchlist - a.watchlist;
            if (activeFilter === 'seen') return b.seen - a.seen;
            return b.count - a.count; // Default 'all'
        });

        if (sorted.length > 0) {
            topMovie = sorted[0];
        }

        setMostRated(topMovie);
        setSortedMovies(sorted);
    };

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

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Contributions</h1>
                    <p className="text-slate-400 mt-1">Track user engagement and ratings</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 p-1 rounded-xl overflow-x-auto max-w-full">
                    {['today', 'week', 'month', 'year', 'all'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${timeframe === t
                                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-sky-500" size={40} />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Double Thumbs Up */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'double_up' ? 'all' : 'double_up')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'double_up' ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                        <div className="flex -space-x-1">
                                            <ThumbsUp size={16} className="rotate-[-15deg]" />
                                            <ThumbsUp size={16} className="rotate-[15deg]" />
                                        </div>
                                    </div>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Double Up</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats.doubleThumbsUp}</div>
                            </div>
                        </button>

                        {/* Thumbs Up */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'up' ? 'all' : 'up')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'up' ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                        <ThumbsUp size={18} />
                                    </div>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Thumbs Up</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats.thumbsUp}</div>
                            </div>
                        </button>

                        {/* Thumbs Down */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'down' ? 'all' : 'down')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'down' ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                                        <ThumbsDown size={18} />
                                    </div>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Thumbs Down</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats.thumbsDown}</div>
                            </div>
                        </button>

                        {/* Ranked */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'ranked' ? 'all' : 'ranked')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'ranked' ? 'border-sky-500 shadow-lg shadow-sky-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-500/20 rounded-full blur-2xl group-hover:bg-sky-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400">
                                        <List size={18} />
                                    </div>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ranked</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats.ranked}</div>
                            </div>
                        </button>

                        {/* Watchlist */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'watchlist' ? 'all' : 'watchlist')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'watchlist' ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                                        <Clock size={18} />
                                    </div>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Watchlist</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats.watchlist}</div>
                            </div>
                        </button>

                        {/* Seen */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === 'seen' ? 'all' : 'seen')}
                            className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden group text-left transition-all focus:outline-none ${activeFilter === 'seen' ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-white/10 hover:border-white/20'}`}
                        >
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-colors" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                        <Eye size={18} />
                                    </div>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Seen</span>
                                </div>
                                <div className="text-3xl font-black text-white">{stats.seen}</div>
                            </div>
                        </button>
                    </div>

                    {/* Top Rated Movies List */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-sky-500" size={24} />
                            {(() => {
                                const timeText = timeframe === 'today' ? 'Today' :
                                    timeframe === 'week' ? 'This Week' :
                                        timeframe === 'month' ? 'This Month' :
                                            timeframe === 'year' ? 'This Year' :
                                                timeframe === 'custom' ? 'Custom Period' : 'All Time';

                                const typeText = activeFilter === 'all' ? 'Top Movies' :
                                    activeFilter === 'double_up' ? 'Most Loved Movies' :
                                        activeFilter === 'up' ? 'Most Liked Movies' :
                                            activeFilter === 'down' ? 'Most Disliked Movies' :
                                                activeFilter === 'ranked' ? 'Most Ranked Movies' :
                                                    activeFilter === 'watchlist' ? 'Most Watchlisted Movies' : 'Most Seen Movies';

                                return `${typeText} ${timeText}`;
                            })()}
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {sortedMovies.length > 0 ? (
                                sortedMovies.slice(0, visibleCount).map((movie, index) => (
                                    <div
                                        key={movie.id}
                                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-6 group hover:bg-white/10 transition-colors w-full"
                                    >
                                        {/* Rank (Far Left) */}
                                        <div className={`
                                            text-2xl font-black w-12 text-center shrink-0
                                            ${index === 0 ? 'text-sky-500' :
                                                index === 1 ? 'text-white' :
                                                    index === 2 ? 'text-slate-300' :
                                                        'text-slate-600'}
                                        `}>
                                            {index + 1}
                                        </div>

                                        {/* Poster */}
                                        <img
                                            src={movie.poster}
                                            alt={movie.title}
                                            className="w-12 h-18 rounded-md shadow-lg border border-white/10 shrink-0 object-cover"
                                        />

                                        {/* Title & Stats */}
                                        <div className="flex-grow flex items-center justify-between min-w-0 gap-4">
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-bold text-white truncate">{movie.title}</h3>

                                                {/* Breakdown */}
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    {movie.doubleUp > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-purple-400 font-medium" title="Double Thumbs Up">
                                                            <div className="flex -space-x-0.5">
                                                                <ThumbsUp size={10} className="rotate-[-15deg]" />
                                                                <ThumbsUp size={10} className="rotate-[15deg]" />
                                                            </div>
                                                            <span>{movie.doubleUp}</span>
                                                        </div>
                                                    )}
                                                    {movie.up > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-green-400 font-medium" title="Thumbs Up">
                                                            <ThumbsUp size={12} />
                                                            <span>{movie.up}</span>
                                                        </div>
                                                    )}
                                                    {movie.down > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-red-400 font-medium" title="Thumbs Down">
                                                            <ThumbsDown size={12} />
                                                            <span>{movie.down}</span>
                                                        </div>
                                                    )}
                                                    {movie.ranked > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-sky-400 font-medium" title="Ranked">
                                                            <List size={12} />
                                                            <span>{movie.ranked}</span>
                                                        </div>
                                                    )}
                                                    {movie.watchlist > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-amber-400 font-medium" title="Watchlist">
                                                            <Clock size={12} />
                                                            <span>{movie.watchlist}</span>
                                                        </div>
                                                    )}
                                                    {movie.seen > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-green-400 font-medium" title="Seen">
                                                            <Eye size={12} />
                                                            <span>{movie.seen}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Score Badge (Right) */}
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 shrink-0">
                                                <Activity className="text-sky-500" size={20} />
                                                <span className="text-xl font-black text-white">
                                                    {activeFilter === 'all' ? movie.count :
                                                        activeFilter === 'double_up' ? movie.doubleUp :
                                                            activeFilter === 'up' ? movie.up :
                                                                activeFilter === 'down' ? movie.down :
                                                                    activeFilter === 'ranked' ? movie.ranked :
                                                                        activeFilter === 'watchlist' ? movie.watchlist : movie.seen}
                                                </span>
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
                                            ? "No contributions found for this period."
                                            : "No movies found matching this filter for this period."}
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

export default AdminContributions;
