import React from 'react';
import { useMovieContext } from '../context/MovieContext';
import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';

export const Watchlist = () => {
    const { lists, removeMovie } = useMovieContext();
    const watchlist = lists['watchlist'] || [];
    const favorites = lists['favorites'] || [];

    const MovieCard = ({ movie, listId }) => (
        <div className="relative group">
            <Link to={`/movie/${movie.id}`} className="block">
                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2">
                    <img
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
                <h3 className="font-bold text-white truncate">{movie.title}</h3>
                <p className="text-slate-400 text-sm">{movie.release_date?.split('-')[0]}</p>
            </Link>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    removeMovie(listId, movie.id);
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
                <div className="flex items-center gap-3 mb-6">
                    <Star className="text-yellow-500" fill="currentColor" />
                    <h2 className="text-2xl font-bold text-white">Favorites</h2>
                    <span className="text-slate-500 text-sm font-medium bg-slate-800 px-2 py-1 rounded-md">
                        {favorites.length}
                    </span>
                </div>
                {favorites.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {favorites.map(movie => (
                            <MovieCard key={movie.uniqueId || movie.id} movie={movie} listId="favorites" />
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 italic">No favorites yet. Star some movies!</p>
                )}
            </section>

            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-white">Watchlist</h2>
                    <span className="text-slate-500 text-sm font-medium bg-slate-800 px-2 py-1 rounded-md">
                        {watchlist.length}
                    </span>
                </div>
                {watchlist.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {watchlist.map(movie => (
                            <MovieCard key={movie.uniqueId || movie.id} movie={movie} listId="watchlist" />
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 italic">Your watchlist is empty.</p>
                )}
            </section>
        </div>
    );
};
