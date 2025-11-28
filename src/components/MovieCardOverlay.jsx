import React from 'react';
import { Star, GripVertical, Trash2, Film } from 'lucide-react';
import { useMovieContext } from '../context/MovieContext';

// Pure presentational component for the drag overlay
// This ensures no dnd-kit hooks are running inside the overlay
const MovieCardOverlay = ({ movie, variant = 'default', className = '' }) => {
    const { getMovieRating } = useMovieContext();
    const userRating = getMovieRating(movie.id);

    // Replicate the visual logic of MovieCard but without any drag hooks
    const isTop10 = variant === 'top10';
    const isUnranked = variant === 'unranked';
    const isMuted = variant === 'muted';

    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
        : null;

    return (
        <div
            className={`
                flex items-center gap-4 backdrop-blur-sm p-3 rounded-xl border 
                bg-slate-800/90 border-sky-500/50 shadow-2xl scale-105
                ${className}
            `}
        >
            {/* Drag Handle */}
            <div className="text-sky-400 cursor-grabbing">
                <GripVertical size={20} />
            </div>

            {/* Poster */}
            <div className="relative shrink-0 shadow-lg group-hover:shadow-sky-500/20 transition-shadow duration-300">
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={movie.title}
                        className="w-12 h-18 object-cover rounded-md"
                    />
                ) : (
                    <div className="w-12 h-18 bg-slate-700 rounded-md flex items-center justify-center">
                        <Film size={20} className="text-slate-500" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white truncate text-lg">
                        {movie.title}
                    </h3>
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                        {movie.release_date?.split('-')[0]}
                    </span>
                    {userRating && (
                        <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded text-xs text-yellow-500 border border-yellow-500/20">
                            <Star size={10} fill="currentColor" />
                            <span>{userRating}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieCardOverlay;
