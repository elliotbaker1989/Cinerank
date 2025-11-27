import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Star, Play, List, ThumbsUp, ThumbsDown, Clock, Calendar, Film, X } from 'lucide-react';
import RatingControls from '../components/RatingControls';
import { getMovieDetails, getMovieVideos } from '../services/api';
import { useMovieContext } from '../context/MovieContext';
import { GENRE_ID_MAP, GENRES } from '../utils/constants';

export const MovieDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addMovie, rateMovie, getMovieRating } = useMovieContext();
    const [movie, setMovie] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);
    const [showGenreSelect, setShowGenreSelect] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const movieData = await getMovieDetails(Number(id));
                const videoData = await getMovieVideos(Number(id));
                setMovie(movieData);
                setVideos(videoData);
            } catch (error) {
                console.error("Failed to fetch movie details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return <div className="text-white text-center mt-20">Loading...</div>;
    }

    if (!movie) {
        return <div className="text-white text-center mt-20">Movie not found</div>;
    }

    const trailer = videos.find(v => v.type === "Trailer" && v.site === "YouTube");
    const cinerankScore = movie.cinerank_score || 85; // Fallback if not in mock
    const isHighScore = cinerankScore >= 80;

    // Filter available genres for this movie that match our lists
    const availableGenres = movie.genres
        .map(g => ({ ...g, listId: GENRE_ID_MAP[g.name] }))
        .filter(g => g.listId);

    const handleAddToRanking = (listId) => {
        addMovie(listId, movie);
        setShowGenreSelect(false);
        // Optional: Add toast notification here
    };

    return (
        <div className="text-white relative pb-20">
            <button
                onClick={() => navigate(-1)}
                className="fixed top-6 left-6 z-50 p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full transition-all group"
            >
                <ArrowLeft size={28} className="text-white group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* 1. Trailer Background Section */}
            <div className="w-full h-[60vh] md:h-[70vh] relative bg-black">
                <div className="absolute inset-0">
                    <img
                        src={movie.backdrop_path || movie.poster_path}
                        alt={movie.title}
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-end">
                    {/* Full Movie Poster (DVD Style) */}
                    <div className="hidden md:block w-64 shrink-0 rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 transform translate-y-12">
                        <img
                            src={movie.poster_path}
                            alt={`${movie.title} Poster`}
                            className="w-full h-auto object-cover"
                        />
                    </div>

                    <div className="flex-grow">
                        {/* 2. Movie Title */}
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 text-glow">{movie.title}</h1>

                        {/* 3. Ratings Row */}
                        <div className="flex flex-wrap items-center gap-8 mb-8">
                            {/* TMDB Rating */}
                            <div className="flex items-center gap-2">
                                <Star className="text-yellow-400 fill-yellow-400" size={24} />
                                <span className="text-2xl font-bold">{movie.vote_average.toFixed(1)}</span>
                                <span className="text-slate-400 text-sm">/ 10</span>
                            </div>

                            {/* CineRank Likeness */}
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                                {isHighScore ? (
                                    <ThumbsUp className="text-green-400" size={20} />
                                ) : (
                                    <ThumbsDown className="text-red-400" size={20} />
                                )}
                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-xl font-bold ${isHighScore ? 'text-green-400' : 'text-red-400'}`}>
                                            {cinerankScore}%
                                        </span>
                                        <span className="text-xs text-slate-300 font-medium uppercase tracking-wide">Likeness</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">From viewers who share your taste</div>
                                </div>
                            </div>

                            {/* User Rating Controls */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">Rate</span>
                                <RatingControls
                                    movieId={movie.id}
                                    userRating={getMovieRating(movie.id)}
                                    onRate={rateMovie}
                                />
                            </div>
                        </div>

                        {/* 4. Quick Info Row */}
                        <div className="flex flex-wrap items-center gap-6 text-slate-300 text-sm md:text-base font-medium mb-8">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-sky-400" />
                                {new Date(movie.release_date).getFullYear()}
                            </div>
                            {movie.runtime && (
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-sky-400" />
                                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Film size={18} className="text-sky-400" />
                                <div className="flex gap-2">
                                    {movie.genres && movie.genres.map(genre => (
                                        <span key={genre.id} className="bg-white/5 px-2 py-0.5 rounded text-slate-200">
                                            {genre.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4">
                            {trailer && (
                                <button
                                    onClick={() => setShowTrailer(true)}
                                    className="flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-bold transition-all hover:bg-slate-200 hover:scale-105 active:scale-95"
                                >
                                    <Play size={24} className="fill-slate-900" />
                                    Play Trailer
                                </button>
                            )}

                            <button
                                onClick={() => addMovie('watchlist', movie)}
                                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-full font-bold transition-all shadow-lg shadow-sky-500/20 hover:scale-105 active:scale-95"
                            >
                                <Plus size={24} />
                                Add to Watch List
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowGenreSelect(!showGenreSelect)}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full font-bold transition-all border border-white/10 hover:scale-105 active:scale-95"
                                >
                                    <List size={24} />
                                    Add to Ranking
                                </button>

                                {showGenreSelect && (
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-3 border-b border-white/5 text-sm font-semibold text-slate-400">
                                            Select a list to add to:
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            <button
                                                onClick={() => handleAddToRanking('all-time')}
                                                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3"
                                            >
                                                <Film size={16} className="text-sky-400" />
                                                All-Time Favorites
                                            </button>
                                            {availableGenres.map(genre => (
                                                <button
                                                    key={genre.id}
                                                    onClick={() => handleAddToRanking(genre.listId)}
                                                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3"
                                                >
                                                    {/* Find icon for genre */}
                                                    {(() => {
                                                        const GenreIcon = GENRES.find(g => g.id === genre.listId)?.icon || Film;
                                                        return <GenreIcon size={16} className="text-sky-400" />;
                                                    })()}
                                                    {genre.name}
                                                </button>
                                            ))}
                                            {availableGenres.length === 0 && (
                                                <div className="px-4 py-3 text-sm text-slate-500 italic">
                                                    No specific genre lists available for this movie.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid md:grid-cols-[2fr_1fr] gap-16 mt-12 md:mt-0">
                <div className="space-y-12">
                    {/* 5. Synopsis */}
                    <section>
                        <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                            <span className="w-1 h-8 bg-sky-500 rounded-full" />
                            Synopsis
                        </h3>
                        <p className="text-lg text-slate-300 leading-relaxed font-light">
                            {movie.overview}
                        </p>
                    </section>

                    {/* 6. Cast & Crew */}
                    {movie.credits && (
                        <section>
                            <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                                <span className="w-1 h-8 bg-purple-500 rounded-full" />
                                Cast & Crew
                            </h3>

                            <div className="mb-6">
                                <span className="text-slate-400 text-sm uppercase tracking-wider font-semibold block mb-2">Director</span>
                                <div className="text-xl font-medium text-white">{movie.credits.director}</div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {movie.credits.cast.map((person, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                        <img
                                            src={person.image}
                                            alt={person.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-semibold text-slate-200 text-sm">{person.name}</div>
                                            <div className="text-xs text-slate-400">{person.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <div className="space-y-12">
                    {/* 7. Where to Watch */}
                    {movie.watch_providers && (
                        <section className="bg-slate-800/30 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                                <span className="w-1 h-6 bg-green-500 rounded-full" />
                                Where to Watch
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {movie.watch_providers.map((provider, idx) => (
                                    <a
                                        key={idx}
                                        href={provider.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-3 rounded-xl bg-black/20 hover:bg-white/10 transition-colors group border border-transparent hover:border-white/10"
                                    >
                                        <img
                                            src={provider.logo}
                                            alt={provider.name}
                                            className="w-10 h-10 rounded-lg shadow-md"
                                        />
                                        <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{provider.name}</span>
                                    </a>
                                ))}
                            </div>
                            <div className="mt-4 text-center">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Powered by TMDB</span>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Trailer Modal */}
            {showTrailer && trailer && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button
                        onClick={() => setShowTrailer(false)}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={32} />
                    </button>
                    <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <iframe
                            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                            title="Movie Trailer"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
