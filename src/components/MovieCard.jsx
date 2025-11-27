import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMovieContext } from '../context/MovieContext';
import RatingControls from './RatingControls';

const MovieCard = ({ movie, index, listId, onRemove }) => {
    const navigate = useNavigate();
    const { rateMovie, getMovieRating } = useMovieContext();
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

    const handleCardClick = (e) => {
        // Prevent navigation if clicking remove or drag handle
        if (e.target.closest('.remove-btn') || e.target.closest('.drag-handle')) {
            return;
        }
        navigate(`/movie/${movie.id}`);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-4 bg-slate-800/50 backdrop-blur-sm p-3 rounded-xl border border-white/5 
                hover:bg-slate-800/80 transition-all cursor-pointer
                ${isDragging ? 'opacity-50 shadow-xl scale-105 ring-2 ring-sky-500' : 'hover:border-white/10'}
            `}
            onClick={handleCardClick}
        >
            {/* Rank Number */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center font-black text-xl text-slate-500/50 group-hover:text-sky-500/50 transition-colors">
                {index + 1}
            </div>

            {/* Poster */}
            <div className="flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden shadow-md">
                <img
                    src={movie.poster_path}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
                <h3 className="font-bold text-slate-200 truncate pr-6">{movie.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
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
                    onRate={rateMovie}
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
                    onClick={() => onRemove(listId, movie.id)}
                    className="remove-btn p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default MovieCard;
