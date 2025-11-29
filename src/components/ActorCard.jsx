import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';

export const ActorCard = ({ actor, index, listId, onRemove, variant = 'default' }) => {
    const navigate = useNavigate();
    const { removeMovie, undoRemove } = useMovieContext();
    const { showToast } = useToast();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: actor.uniqueId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        const removedActor = removeMovie(listId, actor.uniqueId);
        showToast({
            message: `Removed "${actor.name}" from rankings`,
            type: 'info',
            action: {
                label: 'Undo',
                onClick: () => undoRemove(listId, removedActor)
            }
        });
    };

    const handleCardClick = (e) => {
        if (e.target.closest('.remove-btn') || e.target.closest('.drag-handle')) {
            return;
        }
        navigate(`/person/${actor.id}`);
    };

    // Variant Styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'top10':
                return 'bg-slate-800/80 border-sky-500/30 shadow-lg shadow-sky-500/5';
            case 'muted':
                return 'bg-slate-900/40 border-white/5 text-slate-400';
            default:
                return 'bg-slate-800/50 border-white/5';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                group relative flex items-center gap-4 backdrop-blur-sm p-3 rounded-xl border 
                hover:bg-slate-800/90 transition-all cursor-grab active:cursor-grabbing
                ${getVariantStyles()}
                ${isDragging ? 'opacity-50 shadow-xl scale-105 ring-2 ring-sky-500 z-50' : 'hover:border-white/10'}
            `}
            onClick={handleCardClick}
        >
            {/* Rank Number */}
            <div className={`
                flex-shrink-0 w-8 h-8 flex items-center justify-center font-black text-xl transition-colors
                ${variant === 'top10' ? 'text-sky-500' : 'text-slate-600'}
            `}>
                {index >= 0 ? index + 1 : '-'}
            </div>

            {/* Profile Image */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-md border border-white/10">
                {actor.profile_path ? (
                    <img
                        src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                        alt={actor.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <User className="text-slate-600" size={20} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
                <h3 className={`font-bold truncate pr-6 ${variant === 'muted' ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-200'}`}>
                    {actor.name}
                </h3>
                <div className="text-xs text-slate-400 mt-1 truncate">
                    {actor.known_for_department || 'Actor'}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <div className="p-2 text-slate-600 group-hover:text-slate-500 transition-colors">
                    <GripVertical size={16} />
                </div>
                <button
                    onClick={handleRemove}
                    className="remove-btn opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300"
                    aria-label="Remove actor"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};
