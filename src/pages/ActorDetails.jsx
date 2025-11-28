import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, List, ThumbsUp, ThumbsDown, Film, Loader2 } from 'lucide-react';
import { getPersonDetails, getPersonMovieCredits, IMAGE_BASE_URL } from '../services/api';
import { useMovieContext } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';

import { PosterMovieCard } from '../components/PosterMovieCard';

const ActorDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { ratings, lists } = useMovieContext();
    const { user } = useAuth();

    const [person, setPerson] = useState(null);
    const [credits, setCredits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('filmography');

    // Helper to find best rank across all lists
    const getBestRank = useCallback((movieId) => {
        let bestRank = Infinity;
        let bestList = null;

        Object.entries(lists).forEach(([listName, listMovies]) => {
            if (!Array.isArray(listMovies)) return;
            const index = listMovies.findIndex(m => m.id === movieId);
            if (index !== -1) {
                const rank = index + 1;
                if (rank < bestRank) {
                    bestRank = rank;
                    bestList = listName;
                }
            }
        });

        return bestRank === Infinity ? null : { rank: bestRank, list: bestList };
    }, [lists]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [personData, creditsData] = await Promise.all([
                    getPersonDetails(id),
                    getPersonMovieCredits(id)
                ]);
                setPerson(personData);
                // Sort credits: Ranked movies first (by best rank), then others by popularity
                const sortedCredits = creditsData.sort((a, b) => {
                    const rankA = getBestRank(a.id)?.rank || Infinity;
                    const rankB = getBestRank(b.id)?.rank || Infinity;

                    if (rankA !== Infinity && rankB !== Infinity) return rankA - rankB;
                    if (rankA !== Infinity) return -1;
                    if (rankB !== Infinity) return 1;

                    return (b.vote_count || 0) - (a.vote_count || 0);
                });

                setCredits(sortedCredits);
            } catch (error) {
                console.error("Failed to fetch person details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, lists, getBestRank]); // Added lists and getBestRank dependency to re-calc ranks if lists change

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-sky-500" size={48} />
            </div>
        );
    }

    if (!person) {
        return <div className="text-white text-center mt-20">Actor not found</div>;
    }



    // Filter credits based on user data
    const ratedMovies = credits.filter(m => ratings[m.id]);

    // Ranked Movies Logic - Sort by Best Rank
    const rankedMovies = credits
        .map(m => {
            const rankData = getBestRank(m.id);
            return rankData ? { ...m, ...rankData } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.rank - b.rank);

    const watchlistMovies = credits.filter(m => lists.watchlist?.some(w => w.id === m.id));

    return (
        <div className="min-h-screen pb-20 animate-fade-in">
            {/* Header / Bio Section */}
            <div className="relative">
                <div className="absolute inset-0 h-[50vh] bg-gradient-to-b from-slate-900/50 to-slate-900 z-0" />

                <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 relative z-10 flex flex-col md:flex-row gap-8 items-start">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 md:left-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>

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

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">{person.name}</h1>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 text-sm mb-6">
                            {person.birthday && (
                                <span>Born: {new Date(person.birthday).toLocaleDateString()}</span>
                            )}
                            {person.place_of_birth && (
                                <span>• {person.place_of_birth}</span>
                            )}
                        </div>

                        <p className="text-slate-300 leading-relaxed max-w-3xl line-clamp-6 md:line-clamp-none">
                            {person.biography || "No biography available."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <TabButton
                        active={activeTab === 'filmography'}
                        onClick={() => setActiveTab('filmography')}
                        icon={<Film size={18} />}
                        label="Filmography"
                        count={credits.length}
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {activeTab === 'filmography' && credits.map(movie => {
                        const rankData = getBestRank(movie.id);
                        return <PosterMovieCard key={movie.id} movie={movie} rank={rankData?.rank} rankList={rankData?.list} />;
                    })}
                    {activeTab === 'ranked' && (
                        rankedMovies.length > 0 ? rankedMovies.map(movie => (
                            <PosterMovieCard key={movie.id} movie={movie} rank={movie.rank} rankList={movie.list} />
                        )) : <EmptyState message="No ranked movies starring this actor." />
                    )}
                    {activeTab === 'rated' && (
                        ratedMovies.length > 0 ? ratedMovies.map(movie => (
                            <PosterMovieCard key={movie.id} movie={movie} userRating={ratings[movie.id]} />
                        )) : <EmptyState message="You haven't rated any movies starring this actor." />
                    )}
                    {activeTab === 'watchlist' && (
                        watchlistMovies.length > 0 ? watchlistMovies.map(movie => (
                            <PosterMovieCard key={movie.id} movie={movie} />
                        )) : <EmptyState message="No movies from this actor in your watchlist." />
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label, count }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap
            ${active
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
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

const EmptyState = ({ message }) => (
    <div className="col-span-full py-20 text-center">
        <p className="text-slate-500 text-lg">{message}</p>
    </div>
);

export default ActorDetails;
