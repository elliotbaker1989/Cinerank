import React, { useState } from 'react';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Trash2, ThumbsUp, ThumbsDown, List } from 'lucide-react';
import RatingControls from '../components/RatingControls';
import { GENRES } from '../utils/constants';

export const Watchlist = () => {
    const { lists, removeMovie, addMovie, rateMovie, getMovieRating } = useMovieContext();
    const { showToast } = useToast();
    const watchlist = lists['watchlist'] || [];

    const [selectedGenre, setSelectedGenre] = useState('all');
    const [pendingRemoval, setPendingRemoval] = useState(null);

    // Filter watchlist by genre
    const filteredWatchlist = selectedGenre === 'all'
        ? watchlist
        : watchlist.filter(movie =>
            movie.genres?.some(g => {
                const genreConfig = GENRES.find(genre => genre.id === selectedGenre);
                return g.name === genreConfig?.label ||
                    (genreConfig?.label === 'Sci-Fi' && g.name === 'Science Fiction');
            })
        );

    const handleAddToRanking = (movie) => {
        // Add to ranking lists
        addMovie(null, movie);

        // Remove from watchlist
        removeMovie('watchlist', movie.id);

        // Store for potential undo
        setPendingRemoval({ movie, timestamp: Date.now() });

        // Show toast with undo
        showToast(
            <div className="flex items-center gap-3">
                <span>Removed from watch list</span>
                <button
                    onClick={() => handleUndo(movie)}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors"
                >
                    Undo
                </button>
            </div>,
            'info'
        );
    };

    const handleUndo = (movie) => {
        // Add back to watchlist
        addMovie('watchlist', movie);
        setPendingRemoval(null);
    };

    const MovieCard = ({ movie, listId }) => (
        <div className="relative group">
            <Link to={`/movie/${movie.id}`} className="block">
                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative">
                    <img
                        src={movie.poster_path}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Hover Overlay with Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2">
                        {/* Rating Controls */}
                        <div className="flex justify-center" onClick={(e) => e.preventDefault()}>
                            <RatingControls
                                movieId={movie.id}
                                userRating={getMovieRating(movie.id)}
                                onRate={rateMovie}
                                size={16}
                                className="bg-slate-900/80 border-white/10"
                            />
                        </div>

                        {/* Add to Ranking Button */}
                        {listId === 'watchlist' && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleAddToRanking(movie);
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-sky-500/90 hover:bg-sky-600 text-white px-3 py-2 rounded-lg font-bold text-sm transition-colors"
                            >
                                <List size={14} />
                                Add to Ranking
                            </button>
                        )}
                    </div>
                </div>
                <h3 className="font-bold text-white truncate">{movie.title}</h3>
                <p className="text-slate-400 text-sm">{movie.release_date?.split('-')[0]}</p>
            </Link>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    removeMovie(listId, movie.id);
                    if (listId === 'watchlist') {
                        showToast('Removed from watch list', 'info');
                    }
                }}
                className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div className="space-y-12 pb-24">
            <section>
                <h1 className="text-3xl font-bold text-white mb-8 pl-2 border-l-4 border-sky-500 flex items-center gap-3">
                    Watchlist
                    <span className="text-slate-500 text-lg font-medium bg-slate-800 px-3 py-1 rounded-lg">
                        {watchlist.length}
                    </span>
                </h1>

                {/* Genre Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setSelectedGenre('all')}
                        className={`px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap ${selectedGenre === 'all'
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        All ({watchlist.length})
                    </button>
                    {GENRES.filter(g => g.id !== 'all-time').map(genre => {
                        const count = watchlist.filter(movie =>
                            movie.genres?.some(g => {
                                return g.name === genre.label ||
                                    (genre.label === 'Sci-Fi' && g.name === 'Science Fiction');
                            })
                        ).length;

                        if (count === 0) return null;

                        return (
                            <button
                                key={genre.id}
                                onClick={() => setSelectedGenre(genre.id)}
                                className={`px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap ${selectedGenre === genre.id
                                    ? 'bg-sky-500 text-white'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                {genre.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {filteredWatchlist.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {filteredWatchlist.map(movie => (
                            <MovieCard key={movie.uniqueId || movie.id} movie={movie} listId="watchlist" />
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 italic">
                        {selectedGenre === 'all'
                            ? 'Your watchlist is empty.'
                            : `No ${GENRES.find(g => g.id === selectedGenre)?.label} movies in your watchlist.`
                        }
                    </p>
                )}
            </section>
        </div>
    );
};
