import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Film, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchMovies, searchPeople } from '../services/api';
import { useMovieContext } from '../context/MovieContext';

export const SearchBar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { addMovie } = useMovieContext();
    const navigate = useNavigate();
    const wrapperRef = useRef(null);

    useEffect(() => {
        const performSearch = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            const [movieResults, personResults] = await Promise.all([
                searchMovies(query),
                searchPeople(query)
            ]);

            // Combine and interleave results, or just stack them
            // Let's take top 5 movies and top 3 people
            const combinedResults = [
                ...personResults.slice(0, 3),
                ...movieResults.slice(0, 5)
            ];

            setResults(combinedResults);
            setIsOpen(true);
        };

        const timeoutId = setTimeout(performSearch, 300);
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

    const handleResultClick = (item) => {
        if (item.type === 'person') {
            navigate(`/person/${item.id}`);
        } else {
            navigate(`/movie/${item.id}`);
        }
        setQuery('');
        setIsOpen(false);
    };

    const handleAddToWatchlist = (e, movie) => {
        e.stopPropagation();
        addMovie('watchlist', movie);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-3xl mx-auto mb-8 md:mb-16 z-[100]">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-purple-600 rounded-2xl opacity-20 md:blur md:group-focus-within:opacity-50 transition duration-500"></div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Search for movies or people..."
                    className="relative w-full bg-slate-900/80 md:backdrop-blur-2xl border border-white/10 rounded-2xl py-4 md:py-5 pl-12 md:pl-14 pr-4 md:pr-6 text-base md:text-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/30 focus:ring-0 transition-all shadow-2xl"
                />
                <Search className="absolute left-4 md:left-5 top-4 md:top-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={24} />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute w-full mt-4 glass-panel rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[110]">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {results.map((item) => (
                            <div
                                key={`${item.type || 'movie'}-${item.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer group border-b border-white/5 last:border-0"
                                onClick={() => handleResultClick(item)}
                            >
                                {/* Image Handling */}
                                {item.type === 'person' ? (
                                    item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-12 h-12 rounded-full object-cover border border-white/10"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                            <User className="text-slate-600" size={20} />
                                        </div>
                                    )
                                ) : (
                                    item.poster_path ? (
                                        <img
                                            src={item.poster_path}
                                            alt={item.title}
                                            className="w-12 h-16 object-cover rounded-lg shadow-md"
                                        />
                                    ) : (
                                        <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                                            <Film className="text-slate-600" size={20} />
                                        </div>
                                    )
                                )}

                                <div className="flex-grow">
                                    <h4 className="font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                                        {item.type === 'person' ? item.name : item.title}
                                    </h4>
                                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                                        {item.type === 'person'
                                            ? (item.known_for ? `Known for: ${item.known_for}` : 'Actor')
                                            : item.release_date?.split('-')[0]
                                        }
                                    </p>
                                </div>

                                {/* Only show Add button for movies */}
                                {item.type !== 'person' && (
                                    <button
                                        onClick={(e) => handleAddToWatchlist(e, item)}
                                        className="p-2 bg-sky-500/10 text-sky-400 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 hover:bg-sky-500/20"
                                        title="Add to Watchlist"
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
