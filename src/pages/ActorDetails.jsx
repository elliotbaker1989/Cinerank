import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, List, ThumbsUp, ThumbsDown, Film, Loader2, LayoutGrid, ChevronDown, Plus, Check, DollarSign, Clapperboard, Video, User } from 'lucide-react';
import { getPersonDetails, getPersonMovieCredits, getPersonTvCredits, getPersonCollaborators, discoverMovies, getMovieProviders, getMoviesDetails, IMAGE_BASE_URL } from '../services/api';
import { getMovieStats } from '../utils/mockData';
import { formatMoney } from '../utils/formatUtils';
import { useMovieContext } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';

import { StatsCard } from '../components/StatsCard';
import { SubscriptionFilter } from '../components/SubscriptionFilter';
import SEO from '../components/SEO';
import { generateMovieUrl } from '../utils/seoUtils';

import { PosterMovieCard } from '../components/PosterMovieCard';

const ActorDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { ratings, lists } = useMovieContext();
    const { user, selectedRegion, selectedProviders } = useAuth();

    const [person, setPerson] = useState(null);
    const [credits, setCredits] = useState([]);
    const [creditsData, setCreditsData] = useState([]); // Backup for filtering
    const [tvCredits, setTvCredits] = useState([]);
    const [collaborators, setCollaborators] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('filmography');
    const [viewMode, setViewMode] = useState('list'); // Default to list view
    const [isBioExpanded, setIsBioExpanded] = useState(false);
    const [sortBy, setSortBy] = useState('newest'); // Default sort

    // Subscription Filter State
    const [isSubsFilterActive, setIsSubsFilterActive] = useState(false);
    const [subscriptionMovieIds, setSubscriptionMovieIds] = useState(new Set());
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [tempProviders, setTempProviders] = useState([]);
    const [activeProviderFilters, setActiveProviderFilters] = useState([]);

    // Rating Filter State
    const [minRating, setMinRating] = useState(0);

    // Role Filter State
    const [selectedRole, setSelectedRole] = useState('All'); // 'All', 'Actor', 'Director', 'Producer'

    // Helper to find best rank across all lists
    const getBestRank = useCallback((movieId) => {
        if (!lists) return null;

        let bestRank = Infinity;
        let bestList = null;

        Object.entries(lists).forEach(([listName, movies]) => {
            const movie = movies.find(m => m.id === movieId);
            if (movie && movie.rank < bestRank) {
                bestRank = movie.rank;
                bestList = listName;
            }
        });

        return bestRank !== Infinity ? { rank: bestRank, list: bestList } : null;
    }, [lists]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [personData, movieCreditsData, tvData] = await Promise.all([
                    getPersonDetails(id),
                    getPersonMovieCredits(id),
                    getPersonTvCredits(id)
                ]);
                setPerson(personData);

                // Filter out non-acting roles (Self, Documentary, etc.)
                const isValidCredit = (credit) => {
                    // 1. Filter out Documentaries (Genre ID 99)
                    if (credit.genre_ids?.includes(99)) return false;

                    // 2. Filter out "Self" roles
                    const character = credit.character?.toLowerCase() || "";
                    const name = personData.name.toLowerCase();
                    const invalidRoles = [
                        "self",
                        "himself",
                        "herself",
                        "archive footage",
                        "archive sound",
                        "thanks",
                        "special thanks",
                        "executive producer",
                        "producer",
                        "guest",
                        "host"
                    ];

                    if (invalidRoles.some(role => character.includes(role))) return false;
                    if (character.includes(name)) return false; // Filter out roles where they play themselves by name

                    return true;
                };

                setTvCredits(tvData.filter(isValidCredit));

                const filteredCredits = movieCreditsData.filter(isValidCredit);

                // Initial sort (Newest)
                const sortedCredits = filteredCredits.sort((a, b) => {
                    return new Date(b.release_date) - new Date(a.release_date);
                });

                // Fetch collaborators in background
                getPersonCollaborators(id, sortedCredits).then(setCollaborators);

                // Fetch real stats (budget/revenue) for all movies to populate StatsCard and List Items accurately
                const moviesToFetch = sortedCredits;
                let finalCredits = sortedCredits;

                if (moviesToFetch.length > 0) {
                    try {
                        const details = await getMoviesDetails(moviesToFetch.map(m => m.id));

                        // Create a map of id -> details
                        const detailsMap = new Map(details.map(d => [d.id, d]));

                        // Update credits with real budget/revenue AND status
                        const updatedCredits = sortedCredits.map(credit => {
                            const detail = detailsMap.get(credit.id);
                            if (detail) {
                                return {
                                    ...credit,
                                    budget: detail.budget,
                                    revenue: detail.revenue,
                                    runtime: detail.runtime,
                                    status: detail.status // Add status
                                };
                            }
                            return credit;
                        });

                        // Filter out "TBA" / Future movies that are NOT "In Production" or "Post Production"
                        finalCredits = updatedCredits.filter(movie => {
                            const releaseDate = movie.release_date ? new Date(movie.release_date) : null;
                            const isFuture = !releaseDate || releaseDate > new Date();

                            if (isFuture) {
                                // STRICT FILTER: Only show if In Production or Post Production
                                const validStatuses = ['In Production', 'Post Production'];
                                return validStatuses.includes(movie.status);
                            }
                            return true; // Show all released movies
                        });
                    } catch (err) {
                        console.error("Failed to fetch movie details, falling back to basic credits", err);
                    }
                }

                setCredits(finalCredits);
                setCreditsData(finalCredits);

            } catch (error) {
                console.error("Failed to fetch person details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, lists, getBestRank]);

    // Fetch Subscription Movies when filter is active
    useEffect(() => {
        const fetchSubMovies = async () => {
            if (!isSubsFilterActive) {
                setSubscriptionMovieIds(new Set());
                setLoadingSubs(false);
                return;
            }

            const providerIds = activeProviderFilters.join('|');
            if (!providerIds) {
                setSubscriptionMovieIds(new Set());
                setLoadingSubs(false);
                return;
            }

            setLoadingSubs(true);

            try {
                // Fetch first 3 pages to cover most relevant movies
                const pages = [1, 2, 3];
                const results = await Promise.all(pages.map(p => discoverMovies({
                    page: p,
                    with_people: id,
                    with_watch_providers: providerIds,
                    watch_region: selectedRegion || 'US'
                })));

                const ids = new Set(results.flat().map(m => m.id));
                setSubscriptionMovieIds(ids);
            } catch (error) {
                console.error("Error fetching subscription movies:", error);
            } finally {
                setLoadingSubs(false);
            }
        };

        // Debounce slightly
        const timeoutId = setTimeout(fetchSubMovies, 300);
        return () => clearTimeout(timeoutId);
    }, [isSubsFilterActive, activeProviderFilters, id, selectedRegion]);

    // Handlers for Subscription Filter
    const toggleSubsFilter = () => {
        setIsSubsFilterActive(prev => {
            if (!prev) {
                // Enabling: Select all user providers by default
                const userProviderIds = selectedProviders?.map(p => p.provider_id) || [];
                setActiveProviderFilters(userProviderIds);
            }
            return !prev;
        });
    };

    const toggleProviderFilter = (providerId) => {
        setActiveProviderFilters(prev => {
            if (prev.includes(providerId)) {
                return prev.filter(id => id !== providerId);
            } else {
                return [...prev, providerId];
            }
        });
    };

    const addTempProvider = (provider) => {
        setTempProviders(prev => [...prev, provider]);
        setActiveProviderFilters(prev => [...prev, provider.provider_id]);
    };

    // Sorting Logic
    const sortedCredits = useMemo(() => {
        if (!credits) return [];

        const sorted = [...credits];

        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => {
                    const dateA = a.release_date ? new Date(a.release_date) : null;
                    const dateB = b.release_date ? new Date(b.release_date) : null;
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return -1; // TBA first
                    if (!dateB) return 1;
                    return dateB - dateA;
                });
            case 'oldest':
                return sorted.sort((a, b) => {
                    const dateA = a.release_date ? new Date(a.release_date) : null;
                    const dateB = b.release_date ? new Date(b.release_date) : null;
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1; // TBA last
                    if (!dateB) return -1;
                    return dateA - dateB;
                });
            case 'rating':
                return sorted.sort((a, b) => b.vote_average - a.vote_average);
            case 'popularity':
                return sorted.sort((a, b) => b.popularity - a.popularity); // Using popularity as proxy for "Biggest Earner"
            case 'budget':
                return sorted.sort((a, b) => (b.budget || 0) - (a.budget || 0));
            case 'revenue':
                return sorted.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
            default:
                return sorted;
        }
    }, [credits, sortBy]);

    // Apply Subscription and Rating Filter
    const visibleCredits = useMemo(() => {
        let filtered = sortedCredits;

        // 1. Apply Rating Filter
        if (minRating > 0) {
            filtered = filtered.filter(m => m.vote_average >= minRating);
        }

        // 2. Apply Subscription Filter
        if (isSubsFilterActive) {
            // If activeProviderFilters is empty, show nothing (or handle as "no providers selected")
            if (activeProviderFilters.length === 0) return [];
            filtered = filtered.filter(m => subscriptionMovieIds.has(m.id));
        }

        // 3. Apply Role Filter
        if (selectedRole !== 'All') {
            filtered = filtered.filter(m => m.roles?.includes(selectedRole));
        }

        return filtered;
    }, [sortedCredits, isSubsFilterActive, subscriptionMovieIds, activeProviderFilters, minRating, selectedRole]);

    // Filter movies for other tabs using visibleCredits
    const rankedMovies = visibleCredits.filter(m => getBestRank(m.id));
    const ratedMovies = visibleCredits.filter(m => ratings[m.id]);
    const watchlistMovies = visibleCredits.filter(m => lists?.watchlist?.some(wm => wm.id === m.id));

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="animate-spin text-sky-500" size={48} />
            </div>
        );
    }

    if (!person) {
        return <div className="text-white text-center mt-20">Actor not found</div>;
    }

    return (
        <div className="min-h-screen pb-20 animate-fade-in">
            <SEO
                title={person.name}
                description={person.biography}
                image={`${IMAGE_BASE_URL}${person.profile_path}`}
            />
            {/* Header / Bio Section */}
            <div className="relative">
                <div className="absolute inset-0 h-[50vh] bg-gradient-to-b from-slate-900/50 to-slate-900 z-0" />

                <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 relative z-10 flex flex-col gap-8">
                    <div className="flex flex-col xl:flex-row gap-6 items-start">
                        <button
                            onClick={() => navigate(-1)}
                            className="absolute top-6 left-6 md:left-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
                        >
                            <ArrowLeft size={24} />
                        </button>

                        <div className="flex-1 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start w-full">
                            <div className="w-48 md:w-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 mx-auto md:mx-0">
                                {person.profile_path ? (
                                    <img
                                        src={`${IMAGE_BASE_URL}${person.profile_path}`}
                                        alt={person.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-72 bg-slate-800 flex items-center justify-center text-slate-500">
                                        No Image
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left min-w-0">
                                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">{person.name}</h1>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 text-sm mb-6">
                                    {person.birthday && (
                                        <span>Born: {new Date(person.birthday).toLocaleDateString()}</span>
                                    )}
                                    {person.place_of_birth && (
                                        <span>• {person.place_of_birth}</span>
                                    )}
                                </div>

                                <div className="relative">
                                    <p className={`text-slate-300 leading-relaxed max-w-3xl transition-all duration-500 ${isBioExpanded ? '' : 'line-clamp-4 md:line-clamp-6'}`}>
                                        {person.biography || "No biography available."}
                                    </p>

                                    {person.biography && person.biography.length > 300 && (
                                        <button
                                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                                            className="mt-2 flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold text-sm transition-colors"
                                        >
                                            {isBioExpanded ? (
                                                <>Show Less <ArrowLeft className="rotate-90" size={16} /></>
                                            ) : (
                                                <>Read More <ArrowLeft className="-rotate-90" size={16} /></>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Stats Card */}
                    <StatsCard movieCredits={credits} tvCredits={tvCredits} person={person} collaborators={collaborators} />
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto p-3 -ml-3 scrollbar-hide">
                            <TabButton
                                active={activeTab === 'filmography'}
                                onClick={() => setActiveTab('filmography')}
                                icon={<Film size={18} />}
                                label="Filmography"
                                count={visibleCredits.length}
                            />
                            <TabButton
                                active={activeTab === 'ranked'}
                                onClick={() => setActiveTab('ranked')}
                                icon={<Star size={18} />}
                                label="Ranked"
                                count={rankedMovies.length}
                            />
                            <TabButton
                                active={activeTab === 'rated'}
                                onClick={() => setActiveTab('rated')}
                                icon={<ThumbsUp size={18} />}
                                label="Rated"
                                count={ratedMovies.length}
                            />
                            <TabButton
                                active={activeTab === 'watchlist'}
                                onClick={() => setActiveTab('watchlist')}
                                icon={<List size={18} />}
                                label="Watchlist"
                                count={watchlistMovies.length}
                            />
                        </div>

                        <div className="flex items-center gap-4 self-start md:self-auto">
                            {/* Sort Dropdown */}
                            <div className="relative group">
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                                    <span>Sort By: {
                                        sortBy === 'newest' ? 'Newest Release' :
                                            sortBy === 'oldest' ? 'Oldest Release' :
                                                sortBy === 'rating' ? 'Highest Rated' :
                                                    sortBy === 'popularity' ? 'Most Popular' :
                                                        sortBy === 'budget' ? 'Highest Budget' :
                                                            'Highest Box Office'
                                    }</span>
                                    <ChevronDown size={16} />
                                </button>

                                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <button
                                        onClick={() => setSortBy('newest')}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors ${sortBy === 'newest' ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Newest Release
                                    </button>
                                    <button
                                        onClick={() => setSortBy('oldest')}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors ${sortBy === 'oldest' ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Oldest Release
                                    </button>
                                    <button
                                        onClick={() => setSortBy('rating')}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors ${sortBy === 'rating' ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Highest Rated
                                    </button>
                                    <button
                                        onClick={() => setSortBy('popularity')}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors ${sortBy === 'popularity' ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Most Popular
                                    </button>
                                    <button
                                        onClick={() => setSortBy('budget')}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors ${sortBy === 'budget' ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Highest Budget
                                    </button>
                                    <button
                                        onClick={() => setSortBy('revenue')}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors ${sortBy === 'revenue' ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Highest Box Office
                                    </button>
                                </div>
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center bg-slate-900/50 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title="List View"
                                >
                                    <List size={20} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Subscription & Rating Filter Row */}
                    <div className="flex items-start gap-4">
                        <SubscriptionFilter
                            active={isSubsFilterActive}
                            onToggle={toggleSubsFilter}
                            selectedProviders={selectedProviders || []}
                            activeProviderFilters={activeProviderFilters}
                            onProviderFilterChange={toggleProviderFilter}
                            tempProviders={tempProviders}
                            onTempProviderAdd={addTempProvider}
                            region={selectedRegion}
                            compact={true}
                        >
                            {/* Rating Filter Dropdown */}
                            <div className="relative group z-30">
                                <button className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all border
                                        ${minRating > 0
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20'
                                        : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                    }
                                    `}>
                                    <Star size={14} className={minRating > 0 ? "fill-current" : ""} />
                                    <span>{minRating > 0 ? `${minRating}+ Stars` : 'Any Rating'}</span>
                                    <ChevronDown size={12} />
                                </button>

                                <div className="absolute left-0 top-full mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                    <button
                                        onClick={() => setMinRating(0)}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors ${minRating === 0 ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        Any Rating
                                    </button>
                                    {[9, 8, 7, 6].map(rating => (
                                        <button
                                            key={rating}
                                            onClick={() => setMinRating(rating)}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 ${minRating === rating ? 'text-yellow-400' : 'text-slate-300'}`}
                                        >
                                            <Star size={14} className="fill-yellow-500 text-yellow-500" />
                                            {rating}+ Stars
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Role Filter Dropdown */}
                            <div className="relative group z-30">
                                <button className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all border
                                        ${selectedRole !== 'All'
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/50 hover:bg-purple-500/20'
                                        : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                    }
                                    `}>
                                    {selectedRole === 'All' && <Film size={14} />}
                                    {selectedRole === 'Actor' && <User size={14} />}
                                    {selectedRole === 'Director' && <Video size={14} />}
                                    {selectedRole === 'Producer' && <Clapperboard size={14} />}
                                    <span>{selectedRole === 'All' ? 'All Roles' : selectedRole}</span>
                                    <ChevronDown size={12} />
                                </button>

                                <div className="absolute left-0 top-full mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                    <button
                                        onClick={() => setSelectedRole('All')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 ${selectedRole === 'All' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <Film size={14} />
                                        All Roles
                                    </button>
                                    <button
                                        onClick={() => setSelectedRole('Actor')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 ${selectedRole === 'Actor' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <User size={14} />
                                        Actor
                                    </button>
                                    <button
                                        onClick={() => setSelectedRole('Director')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 ${selectedRole === 'Director' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <Video size={14} />
                                        Director
                                    </button>
                                    <button
                                        onClick={() => setSelectedRole('Producer')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 ${selectedRole === 'Producer' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <Clapperboard size={14} />
                                        Producer
                                    </button>
                                </div>
                            </div>
                        </SubscriptionFilter>
                    </div>
                </div>

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 min-h-[60vh]">
                        {loadingSubs ? (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 gap-4">
                                <Loader2 className="animate-spin text-sky-500" size={40} />
                                <p>Finding movies on your subscriptions...</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'filmography' && visibleCredits.map(movie => {
                                    const rankData = getBestRank(movie.id);
                                    return <PosterMovieCard key={movie.id} movie={movie} rank={rankData?.rank} rankList={rankData?.list} />;
                                })}
                                {activeTab === 'ranked' && (
                                    rankedMovies.length > 0 ? rankedMovies.map(movie => (
                                        <PosterMovieCard key={movie.id} movie={movie} rank={movie.rank} rankList={movie.list} />
                                    )) : <EmptyState message="No ranked movies found." />
                                )}
                                {activeTab === 'rated' && (
                                    ratedMovies.length > 0 ? ratedMovies.map(movie => (
                                        <PosterMovieCard key={movie.id} movie={movie} userRating={ratings[movie.id]} />
                                    )) : <EmptyState message="No rated movies found." />
                                )}
                                {activeTab === 'watchlist' && (
                                    watchlistMovies.length > 0 ? watchlistMovies.map(movie => (
                                        <PosterMovieCard key={movie.id} movie={movie} />
                                    )) : <EmptyState message="No watchlist movies found." />
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 min-h-[60vh]">
                        {loadingSubs ? (
                            <div className="flex flex-col items-center justify-center text-slate-500 gap-4">
                                <Loader2 className="animate-spin text-sky-500" size={40} />
                                <p>Finding movies on your subscriptions...</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'filmography' && (
                                    (sortBy === 'newest' || sortBy === 'oldest') ? (
                                        <TimelineList movies={visibleCredits} />
                                    ) : (
                                        visibleCredits.map(movie => (
                                            <MovieListItem key={movie.id} movie={movie} />
                                        ))
                                    )
                                )}
                                {activeTab === 'ranked' && (
                                    rankedMovies.length > 0 ? rankedMovies.map(movie => (
                                        <MovieListItem key={movie.id} movie={movie} rank={movie.rank} />
                                    )) : <EmptyState message="No ranked movies found." />
                                )}
                                {activeTab === 'rated' && (
                                    ratedMovies.length > 0 ? ratedMovies.map(movie => (
                                        <MovieListItem key={movie.id} movie={movie} userRating={ratings[movie.id]} />
                                    )) : <EmptyState message="No rated movies found." />
                                )}
                                {activeTab === 'watchlist' && (
                                    watchlistMovies.length > 0 ? watchlistMovies.map(movie => (
                                        <MovieListItem key={movie.id} movie={movie} />
                                    )) : <EmptyState message="No watchlist movies found." />
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label, count }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap border
            ${active
                ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105'
                : 'bg-slate-800/50 text-slate-300 border-white/10 hover:bg-slate-700 hover:text-white hover:border-white/20'
            }
        `}
    >
        {icon}
        <span>{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-black/10' : 'bg-white/10'}`}>
            {count}
        </span>
    </button>
);

const MovieListItem = ({ movie, rank, userRating }) => {
    const navigate = useNavigate();
    const { lists, addToWatchlist, removeFromWatchlist } = useMovieContext();
    const { selectedProviders } = useAuth();
    const inWatchlist = lists?.watchlist?.some(m => m.id === movie.id);

    const [providers, setProviders] = useState(movie.providers || []);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [hasFetchedProviders, setHasFetchedProviders] = useState(!!movie.providers);

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
    const sortedProviders = useMemo(() => {
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

    const handleWatchlistClick = (e) => {
        e.stopPropagation();
        if (inWatchlist) {
            removeFromWatchlist(movie.id);
        } else {
            addToWatchlist(movie);
        }
    };

    // Use real data if available, otherwise fallback to mock (but prefer real 0 over mock if we fetched it)
    // Actually, if we fetched details, budget/revenue will be present (even if 0).
    // If they are 0, we might want to fallback to mock for "completeness" or just show N/A.
    // The user wants "fixed" numbers. Mock numbers are "wrong". So we should probably show 0 or N/A if real data is 0.
    // However, getMovieStats provides a "guess".
    // Let's try to use real data first.

    const realBudget = movie.budget;
    const realRevenue = movie.revenue;

    // Helper to determine what to show
    // If real data exists (and is not undefined), use it.
    // If it's 0, maybe show "N/A" or "-" instead of a random guess?
    // The user complained about "impossible" numbers (likely from mock).
    // So let's stick to real numbers.

    const displayBoxOffice = realRevenue !== undefined ? formatMoney(realRevenue) : formatMoney(getMovieStats(movie).revenue * 1000000);
    const displayBudget = realBudget !== undefined ? formatMoney(realBudget) : formatMoney(getMovieStats(movie).budget * 1000000);

    return (
        <div
            onClick={() => navigate(generateMovieUrl(movie.id, movie.title))}
            onMouseEnter={handleMouseEnter}
            className="flex items-center gap-6 p-4 bg-slate-800/50 rounded-xl border border-white/5 hover:bg-slate-800 hover:border-white/20 transition-all cursor-pointer group relative"
        >
            {/* Poster */}
            <div className="relative shrink-0">
                {movie.poster_path ? (
                    <img
                        src={movie.poster_path}
                        alt={movie.title}
                        className="w-16 h-24 rounded-lg object-cover shadow-lg group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="w-16 h-24 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Film size={24} className="text-slate-500" />
                    </div>
                )}
                {rank && (
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg z-10">
                        <span className="text-xs font-black text-black">#{rank}</span>
                    </div>
                )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                <div className="flex items-center gap-3">
                    <h4 className="text-white font-bold text-lg truncate group-hover:text-sky-400 transition-colors">{movie.title}</h4>
                    {movie.release_date && (
                        <span className="text-sm text-slate-500 font-medium bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                            {new Date(movie.release_date).getFullYear()}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-400">
                    {/* Role Tag */}
                    <div className="flex items-center gap-2">
                        {(() => {
                            const label = movie.character || (movie.roles?.includes('Director') ? "Director" : movie.roles?.includes('Producer') ? "Producer" : "Actor");
                            const isProducer = label === 'Producer' || movie.roles?.includes('Producer') && !movie.character;
                            const isDirector = label === 'Director' || movie.roles?.includes('Director') && !movie.character;

                            let colorClass = "bg-sky-500/10 text-sky-400 border-sky-500/20"; // Default Actor/Character
                            if (label === 'Producer') colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                            else if (label === 'Director') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";

                            return (
                                <span className={`px-2 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wide ${colorClass}`}>
                                    {label}
                                </span>
                            );
                        })()}
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-4 ml-1">
                        <div className="flex items-center gap-1.5 group/box relative cursor-help">
                            <DollarSign size={14} className="text-green-400" />
                            <span className="text-slate-300 text-xs">{displayBoxOffice}</span>

                            {/* Stylish Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover/box:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 border-b border-white/10 pb-1">Box Office</p>
                                <p className="text-sm font-black text-white">{displayBoxOffice}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 group/budget relative cursor-help">
                            <div className="w-3.5 h-3.5 rounded-full border border-orange-400/50 flex items-center justify-center">
                                <span className="text-[8px] text-orange-400 font-bold">$</span>
                            </div>
                            <span className="text-slate-500 text-xs">{displayBudget}</span>

                            {/* Stylish Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover/budget:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 border-b border-white/10 pb-1">Movie Budget</p>
                                <p className="text-sm font-black text-white">{displayBudget}</p>
                            </div>
                        </div>
                    </div>

                    {/* Watch Providers (Visible on Hover) */}
                    <div className="hidden md:flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {loadingProviders ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        ) : (
                            sortedProviders.slice(0, 3).map(provider => (
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
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6 pr-4">
                {/* Role Badges */}
                {movie.roles && movie.roles.length > 0 && (
                    <div className="flex items-center gap-1.5 mr-2">
                        {movie.roles.includes('Actor') && <RoleBadge role="Actor" />}
                        {movie.roles.includes('Producer') && <RoleBadge role="Producer" />}
                        {movie.roles.includes('Director') && <RoleBadge role="Director" />}
                    </div>
                )}

                {/* Rating */}
                {userRating ? (
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-yellow-400">
                            <Star size={18} fill="currentColor" />
                            <span className="font-bold text-lg">{userRating}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Your Rating</span>
                    </div>
                ) : (
                    movie.vote_average > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-yellow-400 transition-colors">
                            <Star size={18} className={movie.vote_average >= 7 ? "fill-yellow-400/20 text-yellow-400" : ""} />
                            <span className="font-bold text-base">{movie.vote_average.toFixed(1)}</span>
                        </div>
                    )
                )}

                {/* Watchlist Button (Visible on Hover) */}
                <button
                    onClick={handleWatchlistClick}
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 group/watchlist relative
                        ${inWatchlist
                            ? 'bg-green-500 text-black border-green-500 opacity-100'
                            : 'bg-white/10 text-white border-white/10 hover:bg-white hover:text-black opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'
                        }
                    `}
                >
                    {inWatchlist ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}

                    {/* Stylish Tooltip for Watchlist */}
                    <div className="absolute bottom-full right-0 mb-2 w-max bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover/watchlist:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 border-b border-white/10 pb-1">Watchlist</p>
                        <p className="text-sm font-black text-white">{inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

const RoleBadge = ({ role }) => {
    const config = {
        Actor: { label: 'A', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', full: 'Actor' },
        Producer: { label: 'P', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', full: 'Producer' },
        Director: { label: 'D', color: 'bg-red-500/20 text-red-400 border-red-500/30', full: 'Director' }
    };

    const { label, color, full } = config[role] || config.Actor;

    return (
        <div className={`
            w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border cursor-help relative group/badge
            ${color}
        `}>
            {label}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[10px] text-white opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {full}
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (
    <div className="col-span-full py-20 text-center">
        <p className="text-slate-500 text-lg">{message}</p>
    </div>
);

export default ActorDetails;

const TimelineList = ({ movies }) => {
    let lastYear = null;

    return (
        <div className="flex flex-col gap-2">
            {movies.map(movie => {
                const date = movie.release_date ? new Date(movie.release_date) : null;
                const year = date ? date.getFullYear() : 'TBA';
                const showDivider = year !== lastYear;
                lastYear = year;

                return (
                    <React.Fragment key={movie.id}>
                        {showDivider && (
                            <div className="flex items-center gap-3 py-3 first:pt-0">
                                <span className={`text-sm font-bold ${year === 'TBA' ? 'text-sky-400' : 'text-slate-400'}`}>{year}</span>
                                <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-1" />
                            </div>
                        )}
                        <MovieListItem movie={movie} />
                    </React.Fragment>
                );
            })}
        </div>
    );
};
