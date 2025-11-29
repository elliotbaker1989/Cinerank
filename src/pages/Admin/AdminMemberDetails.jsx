import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ArrowLeft, Calendar, Mail, Clock, Star, List, Activity, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { getUserTitle } from '../../utils/userTitles';
import SEO from '../../components/SEO';

const AdminMemberDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [ratings, setRatings] = useState([]);
    const [rankings, setRankings] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ratings'); // 'ratings', 'ranked', 'watchlist'

    useEffect(() => {
        const fetchUserDetails = async () => {
            setLoading(true);
            try {
                // 1. Fetch User Profile
                const userDoc = await getDoc(doc(db, 'users', id));
                if (userDoc.exists()) {
                    setUser({ id: userDoc.id, ...userDoc.data() });
                } else {
                    console.error("User not found");
                    // Handle not found
                }

                // 2. Fetch Ratings
                const ratingsQ = query(collection(db, 'ratings'), where('userId', '==', id), orderBy('timestamp', 'desc'));
                const ratingsSnap = await getDocs(ratingsQ);
                const ratingsData = [];
                ratingsSnap.forEach(doc => ratingsData.push(doc.data()));
                setRatings(ratingsData);

                // 3. Fetch Rankings
                const rankingsQ = query(collection(db, 'rankings'), where('userId', '==', id), orderBy('timestamp', 'desc'));
                const rankingsSnap = await getDocs(rankingsQ);
                const rankingsData = [];
                rankingsSnap.forEach(doc => rankingsData.push(doc.data()));
                setRankings(rankingsData);

                // 4. Fetch Watchlist
                const watchlistQ = query(collection(db, 'watchlists'), where('userId', '==', id), orderBy('timestamp', 'desc'));
                const watchlistSnap = await getDocs(watchlistQ);
                const watchlistData = [];
                watchlistSnap.forEach(doc => watchlistData.push(doc.data()));
                setWatchlist(watchlistData);

            } catch (error) {
                console.error("Error fetching user details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchUserDetails();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="animate-spin text-sky-500" size={40} />
            </div>
        );
    }

    if (!user) {
        return <div className="text-white text-center mt-20">User not found</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalContributions = ratings.length + rankings.length + watchlist.length;
    const titleInfo = getUserTitle(totalContributions);

    return (
        <div className="space-y-8 animate-fade-in">
            <SEO title={`${user.displayName} - CineRank Admin`} />
            {/* Header / Back */}
            <button
                onClick={() => navigate('/cineadmin')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Members
            </button>

            {/* Profile Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-start">
                <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`}
                    alt={user.displayName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl"
                />

                <div className="flex-grow space-y-4">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">{user.displayName}</h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-white/5 ${titleInfo.current.color}`}>
                                {titleInfo.current.title}
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-slate-300 text-sm">
                                <Mail size={14} />
                                {user.email}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-sky-500" />
                            Joined: <span className="text-slate-200">{formatDate(user.dateJoined)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-sky-500" />
                            Last Active: <span className="text-slate-200">{formatDate(user.lastSignIn)}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 min-w-[160px]">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Contributions</div>
                        <div className="text-3xl font-black text-white">{totalContributions}</div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1">
                    <button
                        onClick={() => setActiveTab('ratings')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === 'ratings' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Ratings ({ratings.length})
                        {activeTab === 'ratings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-500 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('ranked')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === 'ranked' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Ranked ({(() => {
                            const uniqueIds = new Set();
                            if (user.lists) {
                                Object.entries(user.lists).forEach(([listName, movies]) => {
                                    if (listName !== 'watchlist' && Array.isArray(movies)) {
                                        movies.forEach(m => uniqueIds.add(m.id));
                                    }
                                });
                            }
                            return uniqueIds.size;
                        })()})
                        {activeTab === 'ranked' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-500 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === 'watchlist' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Watchlist ({watchlist.length})
                        {activeTab === 'watchlist' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-500 rounded-full" />}
                    </button>
                </div>

                {/* Grid View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeTab === 'ratings' && ratings.map(item => (
                        <div
                            key={item.movieId}
                            onClick={() => window.open(`/movie/${item.movieId}`, '_blank')}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-4 group hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <img src={item.posterPath} alt={item.movieTitle} className="w-16 h-24 object-cover rounded-lg shadow-lg" />
                            <div className="flex flex-col justify-between py-1">
                                <h4 className="font-bold text-white line-clamp-2 group-hover:text-sky-400 transition-colors">{item.movieTitle}</h4>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${item.rating === 'double_up' ? 'bg-purple-500/20 text-purple-400' :
                                            item.rating === 'up' ? 'bg-green-500/20 text-green-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {item.rating === 'double_up' && (
                                                <div className="flex -space-x-1">
                                                    <ThumbsUp size={12} className="rotate-[-15deg]" />
                                                    <ThumbsUp size={12} className="rotate-[15deg]" />
                                                </div>
                                            )}
                                            {item.rating === 'up' && <ThumbsUp size={12} />}
                                            {item.rating === 'down' && <ThumbsDown size={12} />}

                                            {item.rating === 'double_up' ? 'Double Up' : item.rating === 'up' ? 'Thumbs Up' : 'Thumbs Down'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {activeTab === 'ranked' && (() => {
                        // Aggregate rankings from user.lists
                        const movieMap = new Map();

                        if (user.lists) {
                            Object.entries(user.lists).forEach(([listName, movies]) => {
                                if (listName === 'watchlist' || !Array.isArray(movies)) return;

                                movies.forEach((movie, index) => {
                                    if (!movieMap.has(movie.id)) {
                                        movieMap.set(movie.id, {
                                            ...movie,
                                            ranks: []
                                        });
                                    }
                                    movieMap.get(movie.id).ranks.push({
                                        list: listName,
                                        rank: index + 1
                                    });
                                });
                            });
                        }

                        const sortedRankedMovies = Array.from(movieMap.values()).sort((a, b) => {
                            const minRankA = Math.min(...a.ranks.map(r => r.rank));
                            const minRankB = Math.min(...b.ranks.map(r => r.rank));
                            return minRankA - minRankB;
                        });

                        if (sortedRankedMovies.length === 0) {
                            return <div className="col-span-full text-center py-12 text-slate-500">No ranked movies yet</div>;
                        }

                        return sortedRankedMovies.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => window.open(`/movie/${item.id}`, '_blank')}
                                className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-4 group hover:bg-white/10 transition-colors relative overflow-hidden cursor-pointer"
                            >
                                <img src={item.poster_path} alt={item.title} className="w-16 h-24 object-cover rounded-lg shadow-lg shrink-0" />
                                <div className="flex flex-col relative z-10 min-w-0 flex-grow">
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {item.ranks.sort((a, b) => a.rank - b.rank).map((rankInfo, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-sky-500/20 border border-sky-500/30 rounded-md px-2 py-1">
                                                <span className="text-sky-400 font-black text-xs">#{rankInfo.rank}</span>
                                                <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">
                                                    {rankInfo.list.replace('-', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <h4 className="font-bold text-white line-clamp-2 leading-tight group-hover:text-sky-400 transition-colors">{item.title}</h4>
                                </div>
                            </div>
                        ));
                    })()}

                    {activeTab === 'watchlist' && watchlist.map(item => (
                        <div
                            key={item.movieId}
                            onClick={() => window.open(`/movie/${item.movieId}`, '_blank')}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-4 group hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <img src={item.posterPath} alt={item.movieTitle} className="w-16 h-24 object-cover rounded-lg shadow-lg" />
                            <div className="flex flex-col justify-between py-1">
                                <h4 className="font-bold text-white line-clamp-2 group-hover:text-sky-400 transition-colors">{item.movieTitle}</h4>
                                <div className="text-[10px] text-slate-500">Added {new Date(item.timestamp).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty States */}
                {activeTab === 'ratings' && ratings.length === 0 && (
                    <div className="text-center py-12 text-slate-500">No ratings yet</div>
                )}

                {activeTab === 'watchlist' && watchlist.length === 0 && (
                    <div className="text-center py-12 text-slate-500">No watchlist items yet</div>
                )}
            </div>
        </div>
    );
};

export default AdminMemberDetails;
