import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Watch, Clock, ThumbsUp, ThumbsDown, Film, Loader2, LayoutGrid, ChevronDown, Plus, Check, DollarSign, Clapperboard, Video, User, Users, List, Heart, Trophy, Sparkles } from 'lucide-react';
import { getPersonDetails, getPersonMovieCredits, getPersonTvCredits, getPersonCollaborators, discoverMovies, getMovieProviders, getMoviesDetails, IMAGE_BASE_URL } from '../services/api';
import { getMovieStats } from '../utils/mockData';
import { formatMoney } from '../utils/formatUtils';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getBillingCategory } from '../utils/billingUtils';

import { StatsCard } from '../components/StatsCard';
import { SubscriptionFilter } from '../components/SubscriptionFilter';
import SEO from '../components/SEO';
import { generateMovieUrl } from '../utils/seoUtils';

import { PosterMovieCard } from '../components/PosterMovieCard';

const GENRE_COLORS = {
    28: '#ef4444', // Action - Red
    12: '#f97316', // Adventure - Orange
    16: '#eab308', // Animation - Yellow
    35: '#84cc16', // Comedy - Lime
    80: '#10b981', // Crime - Emerald
    99: '#06b6d4', // Documentary - Cyan
    18: '#3b82f6', // Drama - Blue
    10751: '#8b5cf6', // Family - Violet
    14: '#d946ef', // Fantasy - Fuchsia
    36: '#f43f5e', // History - Rose
    27: '#9f1239', // Horror - Rose-900
    10402: '#ec4899', // Music - Pink
    9648: '#6366f1', // Mystery - Indigo
    10749: '#ec4899', // Romance - Pink
    878: '#14b8a6', // Science Fiction - Teal
    10770: '#64748b', // TV Movie - Slate
    53: '#f59e0b', // Thriller - Amber
    10752: '#78716c', // War - Stone
    37: '#a8a29e', // Western - Warm Gray
};

const GENRE_NAMES = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const GENRE_ICONS = {
    28: Film, 12: Film, 16: Sparkles, 35: Film, 80: Film,
    99: Film, 18: Film, 10751: Film, 14: Film, 36: Film,
    27: Film, 10402: Film, 9648: Film, 10749: Heart, 878: Film,
    10770: Film, 53: Film, 10752: Film, 37: Film
};

const ActorDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { ratings, lists, addMovie, removeMovie, undoRemove } = useMovieContext();
    const { user, selectedRegion, selectedProviders } = useAuth();
    const { showToast } = useToast();

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
    const [selectedGenres, setSelectedGenres] = useState([]); // Multi-select genre filter
    const [selectedBilling, setSelectedBilling] = useState('All'); // 'All', 'Lead', 'Starring', etc.

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

                setCredits(filteredCredits);
                setCreditsData(filteredCredits);
                setLoading(false); // RENDER IMMEDIATELY

                // Fetch collaborators in background
                getPersonCollaborators(id, sortedCredits).then(setCollaborators);

                // Fetch real stats (budget/revenue) for all movies in BACKGROUND
                const moviesToFetch = sortedCredits;

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
                        const finalCredits = updatedCredits.filter(movie => {
                            const releaseDate = movie.release_date ? new Date(movie.release_date) : null;
                            const isFuture = !releaseDate || releaseDate > new Date();

                            if (isFuture) {
                                // STRICT FILTER: Only show if In Production or Post Production
                                const validStatuses = ['In Production', 'Post Production'];
                                return validStatuses.includes(movie.status);
                            }
                            return true; // Show all released movies
                        });

                        setCredits(finalCredits);
                        setCreditsData(finalCredits);

                    } catch (err) {
                        console.error("Failed to fetch movie details, falling back to basic credits", err);
                    }
                }

            } catch (error) {
                console.error("Failed to fetch person details", error);
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

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

        // 4. Apply Genre Filter
        if (selectedGenres.length > 0) {
            filtered = filtered.filter(m =>
                m.genre_ids?.some(id => selectedGenres.includes(id))
            );
        }

        // 5. Apply Billing Filter
        if (selectedBilling !== 'All') {
            filtered = filtered.filter(m => {
                if (typeof m.order !== 'number') return false;
                return getBillingCategory(m.order) === selectedBilling;
            });
        }

        return filtered;
    }, [sortedCredits, isSubsFilterActive, subscriptionMovieIds, activeProviderFilters, minRating, selectedRole, selectedGenres, selectedBilling]);

    // Calculate Favored Genre
    const favoredGenre = useMemo(() => {
        if (!credits || credits.length === 0) return null;

        const genreCounts = {};
        credits.forEach(movie => {
            if (movie.genre_ids) {
                movie.genre_ids.forEach(id => {
                    if (GENRE_NAMES[id]) {
                        genreCounts[id] = (genreCounts[id] || 0) + 1;
                    }
                });
            }
        });

        const sortedGenres = Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a);

        if (sortedGenres.length > 0) {
            const [id, count] = sortedGenres[0];
            return {
                name: GENRE_NAMES[id],
                color: GENRE_COLORS[id] || '#cbd5e1'
            };
        }
        return null;
    }, [credits]);

    // Calculate Hero Stats (Average Rating & Box Office)
    const heroStats = useMemo(() => {
        if (!credits || credits.length === 0) return null;

        const ratedMovies = credits.filter(m => m.vote_average > 0);
        const avgRating = ratedMovies.length > 0
            ? (ratedMovies.reduce((acc, m) => acc + m.vote_average, 0) / ratedMovies.length).toFixed(1)
            : 'N/A';

        const totalRevenue = credits.reduce((acc, m) => acc + (m.revenue || 0), 0);
        const boxOffice = formatMoney(totalRevenue);

        return { avgRating, boxOffice };
    }, [credits]);



    // Calculate Filter Counts (based on sortedCredits to show total available)
    const filterCounts = useMemo(() => {
        const counts = {
            genres: {},
            roles: { All: sortedCredits.length, Actor: 0, Director: 0, Producer: 0 },
            ratings: { 9: 0, 8: 0, 7: 0, 6: 0, 0: sortedCredits.length },
            billing: {
                'Lead': 0,
                'Starring': 0,
                'Co-Starring': 0,
                'Featured': 0,
                'Minor Roles': 0,
                'Blink & Miss': 0
            }
        };

        sortedCredits.forEach(m => {
            // Genre Counts
            if (m.genre_ids) {
                m.genre_ids.forEach(id => {
                    counts.genres[id] = (counts.genres[id] || 0) + 1;
                });
            }

            // Role Counts
            if (m.roles) {
                if (m.roles.includes('Actor')) counts.roles.Actor++;
                if (m.roles.includes('Director')) counts.roles.Director++;
                if (m.roles.includes('Producer')) counts.roles.Producer++;
            }

            // Rating Counts
            const rating = m.vote_average || 0;
            if (rating >= 9) counts.ratings[9]++;
            if (rating >= 8) counts.ratings[8]++;
            if (rating >= 7) counts.ratings[7]++;
            if (rating >= 6) counts.ratings[6]++;

            // Billing Counts
            if (typeof m.order === 'number') {
                const category = getBillingCategory(m.order);
                if (counts.billing[category] !== undefined) {
                    counts.billing[category]++;
                }
            }
        });

        return counts;
    }, [sortedCredits]);

    // Filter movies for other tabs using visibleCredits
    const rankedMovies = visibleCredits.filter(m => getBestRank(m.id));
    const ratedMovies = visibleCredits.filter(m => ratings[m.id]);
    const watchlistMovies = visibleCredits.filter(m => lists?.watchlist?.some(wm => wm.id === m.id));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <SEO title="Loading... - CineRank" />
                <Loader2 className="animate-spin text-sky-500" size={40} />
            </div>
        );
    }

    if (!person) {
        return <div className="text-white text-center mt-20">Actor not found</div>;
    }

    return (
        <div className="min-h-screen pb-20 animate-fade-in">
            <SEO
                key={person.name}
                title={person.name}
                description={person.biography}
                image={`${IMAGE_BASE_URL}${person.profile_path}`}
            />
            {/* Header / Bio Section */}
            <div className="relative">
                {/* <div className="absolute inset-0 h-[50vh] bg-gradient-to-b from-slate-900/50 to-slate-900 z-0" /> */}

                <div className="max-w-7xl mx-auto px-6 pt-12 pb-12 relative z-10 flex flex-col gap-8">
                    <div className="flex flex-col xl:flex-row gap-6 items-start">
                        <button
                            onClick={() => navigate(-1)}
                            className="absolute top-6 left-6 md:left-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
                        >
                            <ArrowLeft size={24} />
                        </button>

                        <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start w-full">
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

                            {/* Interaction Card */}
                            <div className="flex flex-col gap-3 mt-4 w-48 md:w-64 mx-auto md:mx-0">
                                {/* Hero Stats (Rating & Box Office) */}
                                {heroStats && (
                                    <div className="grid grid-cols-2 gap-2 mb-1">
                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-white/5">
                                            <div className="flex items-center justify-center gap-1 text-yellow-500 mb-0.5">
                                                <Star size={12} fill="currentColor" />
                                                <span className="text-xs font-bold">{heroStats.avgRating}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avg Rating</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-white/5">
                                            <div className="flex items-center justify-center gap-1 text-green-400 mb-0.5">
                                                <DollarSign size={12} />
                                                <span className="text-xs font-bold">{heroStats.boxOffice.replace('$', '')}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Box Office</p>
                                        </div>
                                    </div>
                                )}

                                {/* Favored Genre Tag */}
                                {favoredGenre && (
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Favors</span>
                                        <span
                                            className="text-xs font-bold px-2 py-0.5 rounded-full text-white border"
                                            style={{
                                                backgroundColor: `${favoredGenre.color}20`,
                                                borderColor: `${favoredGenre.color}40`,
                                                color: favoredGenre.color
                                            }}
                                        >
                                            {favoredGenre.name}
                                        </span>
                                    </div>
                                )}
                                {/* Like / Favorite Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const isFavorite = lists?.favorites?.some(a => a.id === person.id);
                                        if (isFavorite) {
                                            const removed = removeMovie('favorites', lists.favorites.find(a => a.id === person.id).uniqueId);
                                            showToast({
                                                message: `Removed ${person.name} from favorites`,
                                                type: 'info',
                                                action: {
                                                    label: 'Undo',
                                                    onClick: () => undoRemove('favorites', removed)
                                                }
                                            });
                                        } else {
                                            addMovie('favorites', person);
                                            showToast({
                                                message: `Added ${person.name} to favorites`,
                                                type: 'like'
                                            });
                                        }
                                    }}
                                    className={`
                                        flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all border
                                        ${lists?.favorites?.some(a => a.id === person.id)
                                            ? 'bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20'
                                            : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                        }
                                    `}
                                >
                                    <Heart size={20} className={lists?.favorites?.some(a => a.id === person.id) ? "fill-current" : ""} />
                                    <span>{lists?.favorites?.some(a => a.id === person.id) ? 'Liked' : 'Like'}</span>
                                </button>

                                {/* Rank Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const isRanked = lists?.actors?.some(a => a.id === person.id);
                                        if (isRanked) {
                                            const removed = removeMovie('actors', lists.actors.find(a => a.id === person.id).uniqueId);
                                            showToast({
                                                message: `Removed ${person.name} from rankings`,
                                                type: 'info',
                                                action: {
                                                    label: 'Undo',
                                                    onClick: () => undoRemove('actors', removed)
                                                }
                                            });
                                        } else {
                                            addMovie('actors', person);
                                            showToast({
                                                message: `Added ${person.name} to rankings`,
                                                type: 'rank'
                                            });
                                        }
                                    }}
                                    className={`
                                        flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all border
                                        ${lists?.actors?.some(a => a.id === person.id)
                                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20'
                                            : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                        }
                                    `}
                                >
                                    <Trophy size={20} className={lists?.actors?.some(a => a.id === person.id) ? "fill-current" : ""} />
                                    <span>{lists?.actors?.some(a => a.id === person.id) ? 'Ranked' : 'Rank'}</span>
                                </button>
                            </div>

                            <div className="flex-1 text-center md:text-left min-w-0">
                                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">{person.name}</h1>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 text-sm mb-6">
                                    {person.birthday && (
                                        <span>
                                            Born: {new Date(person.birthday).toLocaleDateString()}
                                            <span className="text-slate-500 ml-1">
                                                ({(() => {
                                                    const birth = new Date(person.birthday);
                                                    const death = person.deathday ? new Date(person.deathday) : new Date();
                                                    let age = death.getFullYear() - birth.getFullYear();
                                                    const m = death.getMonth() - birth.getMonth();
                                                    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
                                                        age--;
                                                    }
                                                    return age;
                                                })()} years old)
                                            </span>
                                        </span>
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
                                icon={<Watch size={18} />}
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
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex justify-between items-center ${minRating === 0 ? 'text-sky-400' : 'text-slate-300'}`}
                                    >
                                        <span>Any Rating</span>
                                        <span className="text-xs text-slate-500 font-normal">{filterCounts.ratings[0]}</span>
                                    </button>
                                    {[9, 8, 7, 6].map(rating => (
                                        <button
                                            key={rating}
                                            onClick={() => setMinRating(rating)}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${minRating === rating ? 'text-yellow-400' : 'text-slate-300'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Star size={14} className="fill-yellow-500 text-yellow-500" />
                                                <span>{rating}+ Stars</span>
                                            </div>
                                            <span className="text-xs text-slate-500 font-normal">{filterCounts.ratings[rating]}</span>
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
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${selectedRole === 'All' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Film size={14} />
                                            <span>All Roles</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-normal">{filterCounts.roles.All}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedRole('Actor')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${selectedRole === 'Actor' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <User size={14} />
                                            <span>Actor</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-normal">{filterCounts.roles.Actor}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedRole('Director')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${selectedRole === 'Director' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Video size={14} />
                                            <span>Director</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-normal">{filterCounts.roles.Director}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedRole('Producer')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${selectedRole === 'Producer' ? 'text-purple-400' : 'text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clapperboard size={14} />
                                            <span>Producer</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-normal">{filterCounts.roles.Producer}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cast Type Filter Dropdown */}
                            <div className="relative group z-30">
                                <button className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all border
                                        ${selectedBilling !== 'All'
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/50 hover:bg-blue-500/20'
                                        : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                    }
                                    `}>
                                    <Users size={14} className={selectedBilling !== 'All' ? "text-blue-400" : ""} />
                                    <span>{selectedBilling !== 'All' ? selectedBilling : 'All Cast Types'}</span>
                                    <ChevronDown size={12} />
                                </button>

                                <div className="absolute left-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                    <button
                                        onClick={() => setSelectedBilling('All')}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex justify-between items-center ${selectedBilling === 'All' ? 'text-blue-400' : 'text-slate-300'}`}
                                    >
                                        <span>All Cast Types</span>
                                    </button>
                                    {['Lead', 'Starring', 'Co-Starring', 'Featured', 'Minor Roles', 'Blink & Miss'].map(type => {
                                        const count = filterCounts.billing[type] || 0;
                                        if (count === 0) return null;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedBilling(type)}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${selectedBilling === type ? 'text-blue-400' : 'text-slate-300'}`}
                                            >
                                                <span>{type}</span>
                                                <span className="text-xs text-slate-500 font-normal">{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Genre Filter Dropdown (Multi-select) */}
                            <div className="relative group z-30">
                                <button className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all border
                                        ${selectedGenres.length > 0
                                        ? 'bg-pink-500/10 text-pink-400 border-pink-500/50 hover:bg-pink-500/20'
                                        : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                    }
                                    `}>
                                    <LayoutGrid size={14} className={selectedGenres.length > 0 ? "text-pink-400" : ""} />
                                    <span>{selectedGenres.length > 0 ? `${selectedGenres.length} Genres` : 'All Genres'}</span>
                                    <ChevronDown size={12} />
                                </button>

                                <div className="absolute left-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all max-h-64 overflow-y-auto custom-scrollbar">
                                    <div className="p-2 border-b border-white/5">
                                        <button
                                            onClick={() => setSelectedGenres([])}
                                            className="w-full text-center py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    {Object.entries(GENRE_NAMES).map(([id, name]) => {
                                        const genreId = parseInt(id);
                                        const isSelected = selectedGenres.includes(genreId);
                                        const count = filterCounts.genres[genreId] || 0;
                                        const Icon = GENRE_ICONS[genreId] || Film;

                                        if (count === 0) return null; // Optional: Hide genres with 0 count

                                        return (
                                            <button
                                                key={id}
                                                onClick={(e) => {
                                                    e.preventDefault(); // Prevent menu closing
                                                    setSelectedGenres(prev =>
                                                        prev.includes(genreId)
                                                            ? prev.filter(g => g !== genreId)
                                                            : [...prev, genreId]
                                                    );
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${isSelected ? 'text-pink-400' : 'text-slate-300'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon size={14} />
                                                    <span>{name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-normal">{count}</span>
                                                    {isSelected && <Check size={14} className="text-pink-400" />}
                                                </div>
                                            </button>
                                        );
                                    })}
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
    const { showToast } = useToast();
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
            showToast({
                message: `${movie.title} removed from Watchlist`,
                type: 'info',
                icon: <Clock size={18} className="text-sky-400" />
            });
        } else {
            addToWatchlist(movie);
            showToast({
                message: `${movie.title} added to your Watchlist`,
                type: 'success',
                icon: <Clock size={18} className="text-amber-400" />
            });
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
                            ? 'bg-sky-500 text-white border-sky-500 opacity-100'
                            : 'bg-white/10 text-white border-white/10 hover:bg-sky-500 hover:text-white opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'
                        }
                    `}
                >
                    {inWatchlist ? <Clock size={18} strokeWidth={3} /> : <Clock size={18} strokeWidth={3} />}

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
