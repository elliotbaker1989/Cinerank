import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchBar } from '../components/SearchBar';
import { PosterMovieCard } from '../components/PosterMovieCard';
import { Top10Slider } from '../components/Top10Slider';
import { discoverMovies, getWatchProviders, IMAGE_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GENRE_ID_MAP } from '../utils/constants';
import { TrendingUp, Sparkles, Ticket, Calendar, Tv, Loader2, Plus, LogIn } from 'lucide-react';

export const Home = ({ onSignInClick }) => {
    const { selectedRegion, selectedProviders, user, viewAsSignedOut } = useAuth();

    // --- State ---
    const [mainTab, setMainTab] = useState('trending'); // 'trending' | 'foryou'

    // Availability Tabs (Multi-select)
    // keys: 'subs', 'cinemas', 'upcoming'
    const [availability, setAvailability] = useState({
        subs: false,
        cinemas: false,
        upcoming: false
    });

    // Genre Tabs (Multi-select)
    const [selectedGenres, setSelectedGenres] = useState([]);

    // Provider Filter (Multi-select)
    const [activeProviderFilters, setActiveProviderFilters] = useState([]);

    const [movies, setMovies] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Infinite Scroll Observer
    const observer = useRef();
    const lastMovieRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        }, { rootMargin: '500px' });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // --- Handlers ---
    const toggleAvailability = (key) => {
        setAvailability(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            // Reset page and movies on filter change
            setPage(1);
            setMovies([]);

            // If enabling subs, default to ALL selected providers
            if (key === 'subs' && !prev.subs) {
                setActiveProviderFilters(selectedProviders.map(p => p.provider_id));
            }
            // If disabling subs, clear filters
            else if (key === 'subs' && prev.subs) {
                setActiveProviderFilters([]);
            }
            return newState;
        });
    };

    const toggleProviderFilter = (providerId) => {
        setActiveProviderFilters(prev => {
            const newFilters = prev.includes(providerId)
                ? prev.filter(id => id !== providerId)
                : [...prev, providerId];

            setPage(1);
            setMovies([]);
            return newFilters;
        });
    };

    const toggleGenre = (genre) => {
        setSelectedGenres(prev => {
            const newGenres = prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre];
            setPage(1);
            setMovies([]);
            return newGenres;
        });
    };

    const handleMainTabChange = (tab) => {
        if (mainTab !== tab) {
            setMainTab(tab);
            setPage(1);
            setMovies([]);
        }
    };

    // --- Fetch Logic ---
    const [tempProviders, setTempProviders] = useState([]);
    const [showProviderSearch, setShowProviderSearch] = useState(false);
    const [allProviders, setAllProviders] = useState([]);
    const [providerSearchQuery, setProviderSearchQuery] = useState('');
    const searchPopupRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchPopupRef.current && !searchPopupRef.current.contains(event.target)) {
                setShowProviderSearch(false);
            }
        };

        if (showProviderSearch) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProviderSearch]);

    useEffect(() => {
        if (showProviderSearch && allProviders.length === 0) {
            const fetchAllProviders = async () => {
                try {
                    const providers = await getWatchProviders(selectedRegion);
                    // Sort by priority/popularity if possible, or just name
                    setAllProviders(providers.sort((a, b) => a.display_priority - b.display_priority));
                } catch (error) {
                    console.error("Error fetching all providers:", error);
                }
            };
            fetchAllProviders();
        }
    }, [showProviderSearch, selectedRegion, allProviders.length]);

    const addTempProvider = (provider) => {
        setTempProviders(prev => [...prev, provider]);
        // Automatically select it
        setActiveProviderFilters(prev => [...prev, provider.provider_id]);
        setShowProviderSearch(false);
        setProviderSearchQuery('');
        // Trigger refetch
        setPage(1);
        setMovies([]);
    };

    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            try {
                // Construct Filters
                const today = new Date();
                const dateStr = (d) => d.toISOString().split('T')[0];

                let gte = '';
                let lte = '';

                // Date Logic
                if (availability.cinemas && availability.upcoming) {
                    // Both: From 45 days ago to 90 days future
                    const start = new Date(today); start.setDate(today.getDate() - 45);
                    const end = new Date(today); end.setDate(today.getDate() + 90);
                    gte = dateStr(start);
                    lte = dateStr(end);
                } else if (availability.cinemas) {
                    const start = new Date(today); start.setDate(today.getDate() - 45);
                    gte = dateStr(start);
                    lte = dateStr(today);
                } else if (availability.upcoming) {
                    const start = new Date(today); start.setDate(today.getDate() + 1);
                    const end = new Date(today); end.setDate(today.getDate() + 90);
                    gte = dateStr(start);
                    lte = dateStr(end);
                } else if (availability.subs) {
                    // When viewing subscriptions, hide unreleased movies (unless 'upcoming' is also selected)
                    lte = dateStr(today);
                }

                // Providers Logic
                let providerIds = '';
                if (availability.subs) {
                    // If no providers are selected (user unselected all), we shouldn't fetch anything
                    // or fetch with empty string which might mean "all" depending on API.
                    // But logical expectation is: if I unselect everything, I see nothing.
                    // However, TMDB API with empty with_watch_providers might return everything.
                    // Let's assume we pass the selected IDs.
                    if (activeProviderFilters.length > 0) {
                        providerIds = activeProviderFilters.join('|');
                    } else {
                        // If filters are empty but subs is on, we probably want to show nothing
                        // or handle it gracefully. For now, let's pass a dummy ID or handle in UI.
                        // If we pass empty string, discoverMovies might ignore it.
                        // Let's pass a non-existent ID to ensure 0 results if that's the intent,
                        // OR just return early.
                        setMovies([]);
                        setLoading(false);
                        return;
                    }
                }

                // Genre Logic
                const genreIds = selectedGenres.map(g => GENRE_ID_MAP[g]).join(',');

                // Sort Logic
                const sortBy = mainTab === 'trending' ? 'popularity.desc' : 'vote_average.desc';
                const voteCount = mainTab === 'foryou' ? 300 : 50; // Higher threshold for "For You" quality

                // Add a minimum delay for smoother UX
                const startPage = (page - 1) * 3 + 1;
                const pagesToFetch = [startPage, startPage + 1, startPage + 2];

                const [results] = await Promise.all([
                    Promise.all(pagesToFetch.map(p => discoverMovies({
                        page: p,
                        sort_by: sortBy,
                        with_genres: genreIds,
                        with_watch_providers: providerIds,
                        watch_region: selectedRegion,
                        primary_release_date_gte: gte,
                        primary_release_date_lte: lte,
                        vote_count_gte: voteCount,
                        fetchExtras: false
                    }))),
                    new Promise(resolve => setTimeout(resolve, 800))
                ]);

                const newMovies = results.flat();

                setMovies(prev => page === 1 ? newMovies : [...prev, ...newMovies]);
                setHasMore(newMovies.length > 0);
            } catch (error) {
                console.error("Discover error:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce slightly to avoid rapid state changes firing multiple requests
        const timeoutId = setTimeout(fetchMovies, 100);
        return () => clearTimeout(timeoutId);

    }, [page, mainTab, availability, selectedGenres, selectedRegion, selectedProviders, activeProviderFilters]);

    // --- Render Helpers ---
    const genres = Object.keys(GENRE_ID_MAP).filter(g =>
        ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary'].includes(g)
    );

    return (
        <main className="min-h-screen pb-24 space-y-8 animate-fade-in">
            <SearchBar />

            {/* --- Level 1: Main Tabs --- */}
            <div className="flex justify-center gap-8 border-b border-white/10 pb-4">
                <button
                    onClick={() => handleMainTabChange('trending')}
                    className={`text-xl font-bold flex items-center gap-2 transition-colors ${mainTab === 'trending' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <TrendingUp size={24} /> Trending
                </button>
                <button
                    onClick={() => handleMainTabChange('foryou')}
                    className={`text-xl font-bold flex items-center gap-2 transition-colors ${mainTab === 'foryou' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Sparkles size={24} /> What We Think You'll Like
                </button>
            </div>

            {/* --- Level 2: Availability Tabs --- */}
            <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => toggleAvailability('subs')}
                        className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all border ${availability.subs
                            ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_-5px_rgba(74,222,128,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <Tv size={18} /> On My Subscriptions
                    </button>
                    <button
                        onClick={() => toggleAvailability('cinemas')}
                        className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all border ${availability.cinemas
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <Ticket size={18} /> In Cinemas Now
                    </button>
                    <button
                        onClick={() => toggleAvailability('upcoming')}
                        className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all border ${availability.upcoming
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_15px_-5px_rgba(14,165,233,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <Calendar size={18} /> Coming Soon
                    </button>
                </div>

                {/* Show Subscription Icons if 'subs' is active */}
                {availability.subs && (
                    <div className="flex flex-wrap justify-center gap-3 animate-fade-in items-start">
                        {/* Combine saved providers + temp providers */}
                        {[...(selectedProviders || []), ...tempProviders].map(provider => {
                            const isActive = activeProviderFilters.includes(provider.provider_id);
                            return (
                                <button
                                    key={provider.provider_id}
                                    onClick={() => toggleProviderFilter(provider.provider_id)}
                                    className={`relative group flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'scale-110 z-10' : 'hover:scale-105 opacity-50 hover:opacity-80'}`}
                                    title={provider.provider_name}
                                >
                                    <img
                                        src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                                        alt={provider.provider_name}
                                        className={`w-10 h-10 rounded-xl border-2 shadow-md transition-colors ${isActive
                                            ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                            : 'border-white/10 group-hover:border-white/30 grayscale'
                                            }`}
                                    />
                                    {isActive && (
                                        <div className="absolute top-9 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]" />
                                    )}
                                    <span className={`text-[10px] font-medium max-w-[60px] truncate transition-colors ${isActive ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                        {provider.provider_name}
                                    </span>
                                </button>
                            );
                        })}

                        {/* Add Temporary Provider Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProviderSearch(!showProviderSearch)}
                                className="w-10 h-10 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/50 hover:bg-white/5 transition-all text-slate-400 hover:text-white"
                                title="Add temporary subscription"
                            >
                                <Plus size={20} />
                            </button>

                            {/* Search Popover */}
                            {showProviderSearch && (
                                <div ref={searchPopupRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in">
                                    <input
                                        type="text"
                                        placeholder="Search services..."
                                        value={providerSearchQuery}
                                        onChange={(e) => setProviderSearchQuery(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 mb-3"
                                        autoFocus
                                    />
                                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                        {allProviders
                                            .filter(p =>
                                                p.provider_name.toLowerCase().includes(providerSearchQuery.toLowerCase()) &&
                                                !selectedProviders?.some(sp => sp.provider_id === p.provider_id) &&
                                                !tempProviders.some(tp => tp.provider_id === p.provider_id)
                                            )
                                            .map(provider => (
                                                <button
                                                    key={provider.provider_id}
                                                    onClick={() => addTempProvider(provider)}
                                                    className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-left group"
                                                >
                                                    <img
                                                        src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                                                        alt={provider.provider_name}
                                                        className="w-8 h-8 rounded-lg"
                                                    />
                                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate">
                                                        {provider.provider_name}
                                                    </span>
                                                </button>
                                            ))}
                                        {allProviders.length === 0 && (
                                            <div className="text-center py-4 text-slate-500 text-xs">
                                                Loading providers...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Sign In Prompt (if not logged in) */}
                        {(!user && !viewAsSignedOut) || viewAsSignedOut ? (
                            <div className="flex items-center gap-3 ml-2 animate-fade-in">
                                <div className="h-8 w-px bg-white/10 mx-2" />
                                <span className="text-sm text-slate-400 font-medium hidden sm:inline-block">
                                    Sign in to save your subscriptions
                                </span>
                                <button
                                    onClick={onSignInClick}
                                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40"
                                >
                                    <LogIn size={16} />
                                    Sign In
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* --- Level 3: Genre Tabs --- */}
            <div className="flex flex-wrap justify-center gap-2 px-4">
                {genres.map(genre => (
                    <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedGenres.includes(genre)
                            ? 'bg-white text-black border-white scale-105'
                            : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {genre}
                    </button>
                ))}
            </div>

            {/* --- Top 10 Trending Slider --- */}
            {
                mainTab === 'trending' && selectedGenres.length === 0 && (
                    <Top10Slider
                        availability={availability}
                        activeProviderFilters={activeProviderFilters}
                    />
                )
            }

            {/* --- Movie Grid --- */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 px-4 md:px-8">
                {movies.map((movie, index) => {
                    if (movies.length === index + 1) {
                        return (
                            <div ref={lastMovieRef} key={movie.uniqueId}>
                                <PosterMovieCard movie={movie} />
                            </div>
                        );
                    } else {
                        return <PosterMovieCard key={movie.uniqueId} movie={movie} />;
                    }
                })}
            </div>

            {/* --- Loading State --- */}
            {
                loading && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-sky-500" size={40} />
                    </div>
                )
            }

            {
                !loading && movies.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        <p className="text-xl font-bold mb-2">No movies found</p>
                        <p>Try adjusting your filters</p>
                    </div>
                )
            }
        </main >
    );
};
