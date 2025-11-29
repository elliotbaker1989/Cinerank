import React, { useMemo, useState } from 'react';
import { Star, Film, Tv, Calendar, DollarSign, Users, Video, Award, PieChart } from 'lucide-react';
import { IMAGE_BASE_URL } from '../services/api';
import { getMovieStats, generateActorAwards } from '../utils/mockData';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../utils/formatUtils';
import { generatePersonUrl } from '../utils/seoUtils';
import { getBillingCategory } from '../utils/billingUtils';

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

export const StatsCard = ({ movieCredits, tvCredits, person, collaborators }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ALL');

    const stats = useMemo(() => {
        if (!movieCredits || !tvCredits) return null;

        // Calculate Billing Counts (Always based on ALL credits)
        const billingCounts = {
            'Lead': 0,
            'Starring': 0,
            'Co-Starring': 0,
            'Featured': 0,
            'Minor Roles': 0,
            'Blink & Miss': 0,
            'ALL': movieCredits.length
        };

        movieCredits.forEach(m => {
            if (typeof m.order === 'number') {
                const category = getBillingCategory(m.order);
                if (billingCounts[category] !== undefined) {
                    billingCounts[category]++;
                }
            }
        });

        // Filter Credits based on Active Tab
        const filteredMovies = activeTab === 'ALL'
            ? movieCredits
            : movieCredits.filter(m => typeof m.order === 'number' && getBillingCategory(m.order) === activeTab);

        // 1. Average Rating
        const ratedMovies = filteredMovies.filter(m => m.vote_average > 0);
        const avgRating = ratedMovies.length > 0
            ? (ratedMovies.reduce((acc, m) => acc + m.vote_average, 0) / ratedMovies.length).toFixed(1)
            : 'N/A';

        // 2. Total Films
        const totalFilms = filteredMovies.length;

        // 3. Total Series (Only show for ALL, otherwise 0 as we are filtering by movie billing)
        const totalSeries = activeTab === 'ALL' ? tvCredits.length : 0;

        // 4. Highest Rated Movie
        const highestRated = ratedMovies.length > 0
            ? ratedMovies.reduce((prev, current) => (prev.vote_average > current.vote_average) ? prev : current)
            : null;

        // 5. Years Active
        const allDates = filteredMovies.map(m => m.release_date).filter(Boolean).map(d => new Date(d).getFullYear());

        const startYear = allDates.length > 0 ? Math.min(...allDates) : 'N/A';
        const endYear = allDates.length > 0 ? Math.max(...allDates) : 'Present';
        const yearsActive = startYear !== 'N/A' ? `${startYear} - ${endYear === new Date().getFullYear() ? 'Present' : endYear}` : 'N/A';

        // Mock Data
        const cinerankAdds = Math.floor(Math.random() * 50000) + 1000;

        // Calculate Total Box Office from Credits & Favoured Role
        let totalRevenue = 0;
        let totalActorRevenue = 0;
        let totalDirectorRevenue = 0;
        let totalProducerRevenue = 0;

        let roleCounts = { Actor: 0, Director: 0, Producer: 0 };

        filteredMovies.forEach(m => {
            const revenue = m.revenue || 0;
            totalRevenue += revenue;

            if (m.roles?.includes('Actor')) {
                totalActorRevenue += revenue;
                roleCounts.Actor++;
            }
            if (m.roles?.includes('Director')) {
                totalDirectorRevenue += revenue;
                roleCounts.Director++;
            }
            if (m.roles?.includes('Producer')) {
                totalProducerRevenue += revenue;
                roleCounts.Producer++;
            }
            if (!m.roles) roleCounts.Actor++;
        });

        const formattedBoxOffice = formatMoney(totalRevenue);
        const formattedActorBoxOffice = formatMoney(totalActorRevenue);
        const formattedDirectorBoxOffice = formatMoney(totalDirectorRevenue);
        const formattedProducerBoxOffice = formatMoney(totalProducerRevenue);

        // Determine Most Favoured Role
        const mostFavouredRole = Object.entries(roleCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

        // Genre Distribution
        const genreCounts = {};
        let totalGenres = 0;
        filteredMovies.forEach(movie => {
            const movieRoles = movie.roles || ['Actor'];
            if (movieRoles.includes(mostFavouredRole)) {
                if (movie.genre_ids && movie.genre_ids.length > 0) {
                    const primaryGenreId = movie.genre_ids[0];
                    if (GENRE_NAMES[primaryGenreId]) {
                        genreCounts[primaryGenreId] = (genreCounts[primaryGenreId] || 0) + 1;
                        totalGenres++;
                    }
                }
            }
        });

        const sortedGenres = Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([id, count]) => ({
                id: parseInt(id),
                name: GENRE_NAMES[id],
                count,
                percentage: totalGenres > 0 ? Math.round((count / totalGenres) * 100) : 0,
                color: GENRE_COLORS[id] || '#cbd5e1'
            }));

        const topGenre = sortedGenres.length > 0 ? sortedGenres[0].name : 'N/A';

        // Generate Awards (Based on filtered credits)
        const awards = generateActorAwards(person.id, person.popularity, filteredMovies);

        // Filter Collaborators based on filteredMovies
        let filteredCollaborators = null;
        if (collaborators) {
            const filteredMovieTitles = new Set(filteredMovies.map(m => m.title));

            // Filter Co-stars
            const filteredCostars = collaborators.topCostars
                ?.map(c => {
                    const sharedMovies = c.movies.filter(title => filteredMovieTitles.has(title));
                    return { ...c, count: sharedMovies.length, movies: sharedMovies };
                })
                .filter(c => c.count > 0)
                .sort((a, b) => b.count - a.count);

            // Filter Director
            let filteredDirector = null;
            if (collaborators.frequentDirector) {
                const d = collaborators.frequentDirector;
                const sharedMovies = d.movies.filter(title => filteredMovieTitles.has(title));
                if (sharedMovies.length > 0) {
                    filteredDirector = { ...d, count: sharedMovies.length, movies: sharedMovies };
                }
            }

            filteredCollaborators = {
                topCostars: filteredCostars,
                frequentDirector: filteredDirector
            };
        }

        return {
            avgRating,
            totalFilms,
            totalSeries,
            highestRated,
            yearsActive,
            cinerankAdds: cinerankAdds.toLocaleString(),
            totalBoxOffice: formattedBoxOffice,
            boxOfficeBreakdown: {
                actor: formattedActorBoxOffice,
                director: formattedDirectorBoxOffice,
                producer: formattedProducerBoxOffice,
                hasDirector: totalDirectorRevenue > 0,
                hasProducer: totalProducerRevenue > 0
            },
            topCostars: filteredCollaborators?.topCostars,
            frequentDirector: filteredCollaborators?.frequentDirector,
            awards,
            mostFavouredRole,
            genres: sortedGenres,
            topGenre,
            billingCounts
        };
    }, [movieCredits, tvCredits, collaborators, person, activeTab]);

    if (!stats) return null;

    const roleTheme = {
        Actor: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
        Producer: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
        Director: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
    }[stats.mostFavouredRole] || { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' };

    const billingTooltips = {
        'Lead': '1st in the cast list',
        'Starring': '2nd - 5th in the cast list',
        'Co-Starring': '6th - 9th in the cast list',
        'Featured': '10th - 15th in the cast list',
        'Minor Roles': '16th - 26th in the cast list',
        'Blink & Miss': '27th or lower',
        'ALL': 'All credits'
    };

    const billingSubtitles = {
        'Lead': '1st in the cast',
        'Starring': '2nd - 5th in the cast',
        'Co-Starring': '6th - 9th in the cast',
        'Featured': '10th - 15th in the cast',
        'Minor Roles': '16th - 26th in the cast',
        'Blink & Miss': '27th or lower',
        'ALL': ''
    };

    return (
        <div className="mt-8 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Award className="text-yellow-500" size={28} />
                    Career Statistics
                </h3>

                {/* Billing Tabs (Placeholder) */}
                <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                    {['Lead', 'Starring', 'Co-Starring', 'Featured', 'Minor Roles', 'Blink & Miss', 'ALL'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`group relative px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {tab}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === tab ? 'bg-blue-500/50 text-white' : 'bg-white/10 text-slate-300'}`}>
                                {stats.billingCounts[tab] || 0}
                            </span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                {billingTooltips[tab]}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Tab Subtitle */}
            <div className="mb-8 -mt-4 flex items-baseline gap-2">
                <p className="text-slate-400 text-sm font-medium">
                    {activeTab === 'ALL' ? 'All Cast Roles' : `${activeTab} Cast Roles`}
                </p>
                {activeTab !== 'ALL' && (
                    <span className="text-slate-500 text-xs">
                        {billingSubtitles[activeTab]}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
                {/* Column 1: Performance & Impact (Moved to Left) */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                            <Star size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Average Rating</p>
                            <p className="text-3xl font-black text-white">{stats.avgRating}</p>
                            <p className="text-xs text-slate-500">Across all credits</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative group cursor-help">
                        <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Box Office</p>
                            <p className="text-xl font-black text-white">{stats.totalBoxOffice}</p>
                            <p className="text-xs text-slate-500">Total Revenue</p>
                        </div>

                        {/* Box Office Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 border-b border-white/10 pb-1">Revenue Breakdown</p>
                            <div className="space-y-1">
                                <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-slate-300">As Actor:</span>
                                    <span className="font-bold text-green-400">{stats.boxOfficeBreakdown.actor}</span>
                                </div>
                                {stats.boxOfficeBreakdown.hasDirector && (
                                    <div className="flex justify-between gap-4 text-xs">
                                        <span className="text-slate-300">As Director:</span>
                                        <span className="font-bold text-green-400">{stats.boxOfficeBreakdown.director}</span>
                                    </div>
                                )}
                                {stats.boxOfficeBreakdown.hasProducer && (
                                    <div className="flex justify-between gap-4 text-xs">
                                        <span className="text-slate-300">As Producer:</span>
                                        <span className="font-bold text-green-400">{stats.boxOfficeBreakdown.producer}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Community</p>
                            <p className="text-xl font-black text-white">{stats.cinerankAdds}</p>
                            <p className="text-xs text-slate-500">Cinerank Adds</p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Career Output (Moved to Middle) */}
                <div className="pt-8 md:pt-0 md:pl-8 flex flex-col h-full gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                            <Film size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Filmography</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">{stats.totalFilms}</span>
                                <span className="text-sm text-slate-500">Movies</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-slate-300">{stats.totalSeries}</span>
                                <span className="text-xs text-slate-500">Series</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Career Span</p>
                            <p className="text-xl font-black text-white">{stats.yearsActive}</p>
                            <p className="text-xs text-slate-500">Active Years</p>
                        </div>
                    </div>

                    {/* Genre Distribution Bar */}
                    {/* Genre Distribution Bar - Moved to Middle Column */}
                    {stats.genres && stats.genres.length > 0 && (
                        <div className="mt-auto pt-6 border-t border-white/5">
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                            <PieChart size={12} /> Genre Distribution
                                        </p>
                                    </div>
                                    {/* Known For Tag */}
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm text-slate-300 font-medium">Favours:</span>
                                        <span className="text-lg font-black text-white">{stats.topGenre}</span>
                                    </div>
                                </div>

                                <div className="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
                                    {stats.genres.map((genre, index) => (
                                        <div
                                            key={genre.id}
                                            style={{ width: `${genre.percentage}%`, backgroundColor: genre.color }}
                                            className="h-full relative group cursor-help transition-opacity"
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-950 border border-white/10 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: genre.color }} />
                                                        <span className="text-xs font-bold text-white">{genre.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                        <span className="font-bold text-white">{genre.count} movies</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Legend (Top 2 for compact view) */}
                                <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                                    {stats.genres.slice(0, 3).map(genre => (
                                        <div key={genre.id} className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: genre.color }} />
                                            <span>{genre.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 3: Key Collaborators & Highlights */}
                <div className="pt-8 md:pt-0 md:pl-8 space-y-8">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Top Collaborators</p>
                        <div className="space-y-2">
                            {/* Director Card */}
                            {stats.frequentDirector ? (
                                <div
                                    onClick={() => navigate(generatePersonUrl(stats.frequentDirector.id, stats.frequentDirector.name))}
                                    className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex items-center gap-3 hover:bg-slate-800 transition-colors group relative cursor-pointer"
                                >
                                    <img
                                        src={stats.frequentDirector.image ? `${IMAGE_BASE_URL}${stats.frequentDirector.image}` : 'https://via.placeholder.com/40x48?text=?'}
                                        alt={stats.frequentDirector.name}
                                        className="w-10 h-12 rounded-md object-cover shadow-sm group-hover:scale-105 transition-transform"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className="text-white font-bold text-sm leading-tight truncate pr-2">{stats.frequentDirector.name}</p>
                                            <span className="text-[10px] font-bold bg-white/10 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                {stats.frequentDirector.count}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Director</p>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 border-b border-white/10 pb-1">Collaborations</p>
                                        <ul className="space-y-1">
                                            {stats.frequentDirector.movies?.slice(0, 5).map((movie, i) => (
                                                <li key={i} className="text-xs text-white truncate">• {movie}</li>
                                            ))}
                                            {stats.frequentDirector.movies?.length > 5 && (
                                                <li className="text-[10px] text-slate-500 italic pl-2">+{stats.frequentDirector.movies.length - 5} more</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-800/20 p-2 rounded-lg border border-white/5 flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-12 bg-slate-700 rounded-md"></div>
                                    <div className="flex-1">
                                        <div className="h-3 bg-slate-700 rounded w-24 mb-1"></div>
                                        <div className="h-2 bg-slate-700 rounded w-12"></div>
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            {stats.frequentDirector && stats.topCostars?.length > 0 && (
                                <div className="flex items-center gap-3 py-2 opacity-50">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Co-Stars</span>
                                    <div className="h-px bg-white/10 flex-1" />
                                </div>
                            )}

                            {/* Co-Stars List */}
                            {stats.topCostars && stats.topCostars.length > 0 ? (
                                stats.topCostars.map((costar, index) => (
                                    <div
                                        key={costar.id || index}
                                        onClick={() => navigate(generatePersonUrl(costar.id, costar.name))}
                                        className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex items-center gap-3 hover:bg-slate-800 transition-colors group relative cursor-pointer"
                                    >
                                        <img
                                            src={costar.image ? `${IMAGE_BASE_URL}${costar.image}` : 'https://via.placeholder.com/40x48?text=?'}
                                            alt={costar.name}
                                            className="w-10 h-12 rounded-md object-cover shadow-sm group-hover:scale-105 transition-transform"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <p className="text-white font-bold text-sm leading-tight truncate pr-2">{costar.name}</p>
                                                <span className="text-[10px] font-bold bg-white/10 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                    {costar.count}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Co-Star</p>
                                        </div>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 border-b border-white/10 pb-1">Collaborations</p>
                                            <ul className="space-y-1">
                                                {costar.movies?.slice(0, 5).map((movie, i) => (
                                                    <li key={i} className="text-xs text-white truncate">• {movie}</li>
                                                ))}
                                                {costar.movies?.length > 5 && (
                                                    <li className="text-[10px] text-slate-500 italic pl-2">+{costar.movies.length - 5} more</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                !stats.frequentDirector && (
                                    <div className="bg-slate-800/20 p-2 rounded-lg border border-white/5 flex items-center gap-3 animate-pulse">
                                        <div className="w-10 h-12 bg-slate-700 rounded-md"></div>
                                        <div className="flex-1">
                                            <div className="h-3 bg-slate-700 rounded w-24 mb-1"></div>
                                            <div className="h-2 bg-slate-700 rounded w-12"></div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>


                </div>
            </div>


        </div>
    );
};
