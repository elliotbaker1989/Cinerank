import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import MovieCard from './MovieCard';
import { useMovieContext } from '../context/MovieContext';
import { Film } from 'lucide-react';

export const MovieList = ({ listId }) => {
    const { lists, reorderList, removeMovie } = useMovieContext();
    const movies = lists[listId] || [];

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = movies.findIndex((m) => m.uniqueId === active.id);
            const newIndex = movies.findIndex((m) => m.uniqueId === over.id);

            const newOrder = arrayMove(movies, oldIndex, newIndex);
            reorderList(listId, newOrder);
        }
    };

    if (movies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 text-center group hover:border-white/20 transition-colors">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Film className="text-slate-500 group-hover:text-sky-400 transition-colors" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">Your list is empty</h3>
                <p className="text-slate-400 max-w-xs mx-auto">
                    Search for movies above to start building your Top 10 collection.
                </p>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={movies.map(m => m.uniqueId)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-3">
                    {movies.map((movie, index) => (
                        <MovieCard
                            key={movie.uniqueId}
                            movie={movie}
                            index={index}
                            listId={listId}
                            onRemove={removeMovie}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
