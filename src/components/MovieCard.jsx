import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import RatingControls from './RatingControls';
import { formatReleaseDate } from '../utils/dateUtils';

export const MovieCard = ({ movie, index, listId, onRemove, variant = 'default' }) => {
    const navigate = useNavigate();
    const { rateMovie, getMovieRating, removeMovie, moveToUnranked, undoRemove, undoMoveToUnranked } = useMovieContext();
    const { showToast } = useToast();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: movie.uniqueId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    const handleRemove = (e) => {
        e.stopPropagation();

        if (movie.unranked) {
            // Fully remove unranked movie
            const removedMovie = removeMovie(listId, movie.uniqueId);
            showToast({
                message: `Removed "${movie.title}" from collection`,
                type: 'info',
                action: {
                    label: 'Undo',
                    onClick: () => undoRemove(listId, removedMovie)
                }
            });
        } else {
            // Fully remove ranked movie (per user request)
            const removedMovie = removeMovie(listId, movie.uniqueId);
            showToast({
                message: `Removed "${movie.title}" from rankings`,
                type: 'info',
                action: {
                    label: 'Undo',
                    onClick: () => undoRemove(listId, removedMovie)
                }
            });
        }
    };

    const handleCardClick = (e) => {
        // Prevent navigation if clicking remove or drag handle
        if (e.target.closest('.remove-btn') || e.target.closest('.drag-handle')) {
            return;
        }
        navigate(`/movie/${movie.id}`);
    };

    // Variant Styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'top10':
                return 'bg-slate-800/80 border-sky-500/30 shadow-lg shadow-sky-500/5';
            case 'muted':
                return 'bg-slate-900/40 border-white/5 text-slate-400';
            case 'unranked':
                return 'bg-slate-900/20 border-white/5 opacity-80 hover:opacity-100';
            default:
                return 'bg-slate-800/50 border-white/5';
        }
    };

    const releaseLabel = formatReleaseDate(movie.release_date);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-4 backdrop-blur-sm p-3 rounded-xl border 
                hover:bg-slate-800/90 transition-all cursor-pointer
                ${getVariantStyles()}
                ${isDragging ? 'opacity-50 shadow-xl scale-105 ring-2 ring-sky-500 z-50' : 'hover:border-white/10'}
            `}
            onClick={handleCardClick}
        >
            {/* Rank Number */}
            <div className={`
                flex-shrink-0 w-8 h-8 flex items-center justify-center font-black text-xl transition-colors
                ${variant === 'top10' ? 'text-sky-500' : 'text-slate-600'}
                ${variant === 'unranked' ? 'opacity-0' : ''}
            `}>
                {index >= 0 ? index + 1 : '-'}
            </div>

            {/* Poster */}
            <div className="flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden shadow-md">
                <img
                    src={movie.poster_path}
                    alt={movie.title}
                    className={`w-full h-full object-cover ${variant === 'muted' || variant === 'unranked' ? 'grayscale-[0.5] group-hover:grayscale-0 transition-all' : ''}`}
                />
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
                <h3 className={`font-bold truncate pr-6 ${variant === 'muted' ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-200'}`}>
                    {movie.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 relative">
                    {releaseLabel && (
                        <div className="absolute -top-6 left-0 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 z-20">
                            {releaseLabel}
                        </div>
                    )}
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                    <span className="flex items-center gap-1 text-yellow-500/80">
                        <Star size={10} fill="currentColor" />
                        {movie.vote_average.toFixed(1)}
                    </span>
                </div>
            </div>

            {/* Rating Controls */}
            <div className="mr-4 hidden sm:block" onClick={(e) => e.stopPropagation()}>
                <RatingControls
                    movieId={movie.id}
                    userRating={getMovieRating(movie.id)}
                    onRate={(movieId, rating) => rateMovie(movie, rating)}
                    size={14}
                    className="bg-slate-900/50 border-white/5 p-0.5"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <button
                    {...attributes}
                    {...listeners}
                    className="drag-handle p-2 text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded-lg transition-colors"
                >
                    <GripVertical size={16} />
                </button>
                <button
                    onClick={handleRemove}
                    className="remove-btn opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300"
                    aria-label="Remove movie"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}


