import React, { useState, useEffect, useRef } from 'react';
import { Search, Bookmark, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../services/api';
import { useMovieContext } from '../context/MovieContext';

export const SearchBar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { addMovie } = useMovieContext();
    const wrapperRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMovies = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            const data = await searchMovies(query);
            setResults(data);
            setIsOpen(true);
        };

        const timeoutId = setTimeout(fetchMovies, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigateToMovie = (movieId) => {
        navigate(`/movie/${movieId}`);
        setQuery('');
        setIsOpen(false);
    };

    const handleAddToWatchlist = (e, movie) => {
        e.stopPropagation(); // Prevent navigation when clicking watchlist icon
        addMovie('watchlist', movie);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-3xl mx-auto mb-16 z-50">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Search for movies..."
                    className="relative w-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/30 focus:ring-0 transition-all shadow-2xl"
                />
                <Search className="absolute left-5 top-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={28} />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute w-full mt-4 glass-panel rounded-2xl overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {results.map((movie) => (
                            <div
                                key={movie.id}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer group border-b border-white/5 last:border-0"
                                onClick={() => handleNavigateToMovie(movie.id)}
                            >
                                {movie.poster_path ? (
                                    <img
                                        src={movie.poster_path}
                                        alt={movie.title}
                                        className="w-12 h-16 object-cover rounded-lg shadow-md"
                                    />
                                ) : (
                                    <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                                        <Film className="text-slate-600" size={20} />
                                    </div>
                                )}

                                <div className="flex-grow">
                                    <h4 className="font-bold text-slate-100 group-hover:text-sky-400 transition-colors">{movie.title}</h4>
                                    <p className="text-sm text-slate-400 mt-1">{movie.release_date?.split('-')[0]}</p>
                                </div>

                                <button
                                    onClick={(e) => handleAddToWatchlist(e, movie)}
                                    className="p-2 bg-sky-500/10 text-sky-400 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 hover:bg-sky-500/20"
                                    title="Add to Watchlist"
                                >
                                    <Bookmark size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
