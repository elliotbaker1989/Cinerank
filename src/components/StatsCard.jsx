import React, { useMemo } from 'react';
import { Star, Film, Tv, Calendar, DollarSign, Users, Video, Award, PieChart } from 'lucide-react';
import { IMAGE_BASE_URL } from '../services/api';
import { getMovieStats, generateActorAwards } from '../utils/mockData';
import { formatMoney } from '../utils/formatUtils';

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
    const stats = useMemo(() => {
        if (!movieCredits || !tvCredits) return null;

        // 1. Average Rating
        const ratedMovies = movieCredits.filter(m => m.vote_average > 0);
        const avgRating = ratedMovies.length > 0
            ? (ratedMovies.reduce((acc, m) => acc + m.vote_average, 0) / ratedMovies.length).toFixed(1)
            : 'N/A';

        // 2. Total Films
        const totalFilms = movieCredits.length;

        // 3. Total Series
        const totalSeries = tvCredits.length;

        // 4. Highest Rated Movie
        const highestRated = ratedMovies.length > 0
            ? ratedMovies.reduce((prev, current) => (prev.vote_average > current.vote_average) ? prev : current)
            : null;

        // 5. Years Active
        const allDates = movieCredits.map(m => m.release_date).filter(Boolean).map(d => new Date(d).getFullYear());

        const startYear = allDates.length > 0 ? Math.min(...allDates) : 'N/A';
        const yearsActive = startYear !== 'N/A' ? `${startYear} - Present` : 'N/A';

        // Mock Data for requested fields that aren't available in standard credits API
        const cinerankAdds = Math.floor(Math.random() * 50000) + 1000; // Mock

        // Calculate Total Box Office from Credits & Favoured Role
        let totalRevenue = 0;
        let totalActorRevenue = 0;
        let totalDirectorRevenue = 0;
        let totalProducerRevenue = 0;

        let roleCounts = { Actor: 0, Director: 0, Producer: 0 };

        movieCredits.forEach(m => {
            // Use real revenue if available, otherwise 0 (don't mock anymore)
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
            // Fallback if roles not explicitly set (default to Actor for cast list)
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
        movieCredits.forEach(movie => {
            // Only count genres for movies where they played their favoured role
            const movieRoles = movie.roles || ['Actor'];
            if (movieRoles.includes(mostFavouredRole)) {
                if (movie.genre_ids) {
                    movie.genre_ids.forEach(id => {
                        if (GENRE_NAMES[id]) {
                            genreCounts[id] = (genreCounts[id] || 0) + 1;
                            totalGenres++;
                        }
                    });
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

        // Generate Awards
        const awards = generateActorAwards(person.id, person.popularity, movieCredits);

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
            frequentCostar: collaborators?.frequentCostar,
            frequentDirector: collaborators?.frequentDirector,
            awards,
            mostFavouredRole,
            genres: sortedGenres,
            topGenre
        };
    }, [movieCredits, tvCredits, collaborators, person]);

    if (!stats) return null;

    const roleTheme = {
        Actor: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
        Producer: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
        Director: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
    }[stats.mostFavouredRole] || { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' };

    return (
        <div className="mt-8 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <Award className="text-yellow-500" size={28} />
                Career Statistics
            </h3>

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
                <div className="pt-8 md:pt-0 md:pl-8 space-y-8">
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
                    {stats.genres && stats.genres.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <PieChart size={12} /> Genre Distribution
                                    </p>
                                    {/* Most Favoured Role Tag */}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border text-white ${roleTheme.bg} ${roleTheme.border}`}>
                                        Role: <span className={roleTheme.text}>{stats.mostFavouredRole}</span>
                                    </span>
                                </div>
                                {/* Known For Tag - Slightly Bigger */}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm text-slate-300 font-medium">Favours:</span>
                                    <span className="text-lg font-black text-white">{stats.topGenre}</span>
                                </div>
                            </div>

                            <div className="h-3 w-full bg-slate-800 rounded-full flex">
                                {stats.genres.map((genre, index) => (
                                    <div
                                        key={genre.id}
                                        style={{ width: `${genre.percentage}%`, backgroundColor: genre.color }}
                                        className="h-full relative group cursor-help first:rounded-l-full last:rounded-r-full transition-opacity"
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
                            {/* Legend (Top 3) */}
                            <div className="flex gap-3 text-[10px] text-slate-500">
                                {stats.genres.slice(0, 3).map(genre => (
                                    <div key={genre.id} className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: genre.color }} />
                                        <span>{genre.name}</span>
                                    </div>
                                ))}
                                {stats.genres.length > 3 && <span>+{stats.genres.length - 3} more</span>}
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
                                <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex items-center gap-3 hover:bg-slate-800 transition-colors group relative">
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

                            {/* Co-Star Card */}
                            {stats.frequentCostar ? (
                                <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex items-center gap-3 hover:bg-slate-800 transition-colors group relative">
                                    <img
                                        src={stats.frequentCostar.image ? `${IMAGE_BASE_URL}${stats.frequentCostar.image}` : 'https://via.placeholder.com/40x48?text=?'}
                                        alt={stats.frequentCostar.name}
                                        className="w-10 h-12 rounded-md object-cover shadow-sm group-hover:scale-105 transition-transform"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className="text-white font-bold text-sm leading-tight truncate pr-2">{stats.frequentCostar.name}</p>
                                            <span className="text-[10px] font-bold bg-white/10 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                {stats.frequentCostar.count}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Co-Star</p>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 border-b border-white/10 pb-1">Collaborations</p>
                                        <ul className="space-y-1">
                                            {stats.frequentCostar.movies?.slice(0, 5).map((movie, i) => (
                                                <li key={i} className="text-xs text-white truncate">• {movie}</li>
                                            ))}
                                            {stats.frequentCostar.movies?.length > 5 && (
                                                <li className="text-[10px] text-slate-500 italic pl-2">+{stats.frequentCostar.movies.length - 5} more</li>
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
                        </div>
                    </div>

                    {stats.awards && stats.awards.length > 0 && (
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                                <Award size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Awards</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {stats.awards.map((award, index) => (
                                        <div key={index} className="relative group cursor-help">
                                            <span className="text-xs font-bold text-white bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full hover:bg-yellow-500/20 transition-colors">
                                                {award.count > 1 ? `${award.count}x ` : ''}{award.name}
                                            </span>

                                            {/* Award Details Tooltip */}
                                            {award.details && award.details.length > 0 && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 border-b border-white/10 pb-1">Awarded For</p>
                                                    <ul className="space-y-1.5">
                                                        {award.details.map((detail, i) => (
                                                            <li key={i} className="text-xs text-white">
                                                                <span className="font-bold block text-yellow-400">{detail.movie}</span>
                                                                <span className="text-[10px] text-slate-500">{detail.year}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
