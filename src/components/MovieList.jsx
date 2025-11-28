import React from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { MovieCard } from './MovieCard';
import MovieCardOverlay from './MovieCardOverlay';
import DroppableEmptyZone from './DroppableEmptyZone';
import { useMovieContext } from '../context/MovieContext';
import { Film, Search } from 'lucide-react';


const DroppableSection = ({ id, children, className }) => {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={className}>
            {children}
        </div>
    );
};

export const MovieList = ({ listId }) => {
    const { lists, reorderList, removeMovie } = useMovieContext();
    const allMovies = lists[listId] || [];

    const [expanded21Plus, setExpanded21Plus] = React.useState(false);
    const [expandedUnranked, setExpandedUnranked] = React.useState(false);
    const [unrankedSearch, setUnrankedSearch] = React.useState('');
    const [activeId, setActiveId] = React.useState(null);

    // Separate ranked and unranked
    const rankedMovies = allMovies.filter(m => !m.unranked);
    const unrankedMovies = allMovies.filter(m => m.unranked);

    // Filter unranked movies by search
    const filteredUnrankedMovies = unrankedMovies.filter(movie =>
        movie.title.toLowerCase().includes(unrankedSearch.toLowerCase())
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts to prevent accidental clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Track the current state of the dragged item to prevent stale closure loops
    const dragState = React.useRef({ activeId: null, unranked: false });
    const updateAnimationFrame = React.useRef(null);
    // Hysteresis lock to prevent rapid section switching (flickering)
    const sectionLock = React.useRef({ time: 0, targetUnranked: null });

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);

        const movie = allMovies.find(m => m.uniqueId === active.id);
        if (movie) {
            dragState.current = { activeId: active.id, unranked: movie.unranked };
            // Reset lock on start
            sectionLock.current = { time: 0, targetUnranked: null };
        }
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!active || !over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        // Find the containers
        const overMovie = allMovies.find(m => m.uniqueId === overId);

        // Determine target unranked status based on explicit drop zones or item association
        let targetUnranked;

        // 1. Explicit Drop Zones
        if (overId === 'empty-top-10' || overId === 'ranked-items-top10' || overId === 'ranked-items-honorable' || overId === 'ranked-items-21plus') {
            targetUnranked = false;
        } else if (overId === 'unranked-items') {
            targetUnranked = true;
        }
        // 2. Hovering over an item
        else if (overMovie) {
            targetUnranked = overMovie.unranked;
        } else {
            // Hovering over something else (like the main container padding), keep current state to avoid flickering
            return;
        }

        // Check against our REF state, not the potentially stale prop state
        const currentUnrankedState = dragState.current.unranked;

        if (dragState.current.activeId === activeId && currentUnrankedState !== targetUnranked) {

            // HYSTERESIS CHECK:
            // If we recently switched sections, prevent switching back immediately.
            // This stops the "flicker" where layout shifts cause the cursor to fall back into the old zone.
            const now = Date.now();
            if (now - sectionLock.current.time < 300) {
                // We are locked. But wait - if we are trying to switch to the SAME target we locked to, that's fine (it means we are stable).
                // The issue is if we are trying to switch BACK to the *old* state (which is what flickering is).
                if (sectionLock.current.targetUnranked !== targetUnranked) {
                    return; // Reject the switch back
                }
            }

            const oldIndex = allMovies.findIndex(m => m.uniqueId === activeId);
            let newIndex = -1;

            if (overId === 'empty-top-10' || overId === 'ranked-items-top10') {
                newIndex = 0;
            } else if (overId === 'ranked-items-honorable') {
                newIndex = 10; // Start of honorable mentions
            } else if (overId === 'ranked-items-21plus') {
                newIndex = 20; // Start of 21+
            } else {
                newIndex = allMovies.findIndex(m => m.uniqueId === overId);
            }

            // If newIndex is -1 (e.g. hovering over unranked container), default to end of that list
            // But for visual smoothness, we might just want to switch the unranked status and let it float to the bottom

            const newMovies = [...allMovies];
            // Update the unranked status
            newMovies[oldIndex] = { ...newMovies[oldIndex], unranked: targetUnranked };

            // Move the item to the new position
            // If we have a valid index, move it there. If not, we just change status (effectively moving to end of that section)
            let reordered = newMovies;
            if (newIndex !== -1) {
                reordered = arrayMove(newMovies, oldIndex, newIndex);
            }

            // Update our ref IMMEDIATELY so subsequent dragOver events (before render) see the new state
            dragState.current = { activeId, unranked: targetUnranked };

            // Set the lock
            sectionLock.current = { time: now, targetUnranked: targetUnranked };

            // Cancel any pending update
            if (updateAnimationFrame.current) cancelAnimationFrame(updateAnimationFrame.current);

            // Schedule the update for the next animation frame to avoid React render conflicts and flickering
            updateAnimationFrame.current = requestAnimationFrame(() => {
                reorderList(listId, reordered);
            });
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId !== overId) {
            const oldIndex = allMovies.findIndex((m) => m.uniqueId === activeId);
            const newIndex = overId === 'empty-top-10'
                ? 0
                : allMovies.findIndex((m) => m.uniqueId === overId);

            if (newIndex === -1) return;

            const newOrder = arrayMove(allMovies, oldIndex, newIndex);

            // Ensure the unranked status is correct based on where it landed
            const activeItem = newOrder[newIndex];
            const overItem = allMovies.find(m => m.uniqueId === overId);

            if (overId === 'empty-top-10' || overId === 'ranked-items-top10') {
                activeItem.unranked = false;
            } else if (overId === 'ranked-items-honorable' || overId === 'ranked-items-21plus') {
                activeItem.unranked = false;
            } else if (overId === 'unranked-items') {
                activeItem.unranked = true;
            } else if (overItem) {
                activeItem.unranked = overItem.unranked;
            }

            reorderList(listId, newOrder);
        }
    };

    const activeMovie = activeId ? allMovies.find(m => m.uniqueId === activeId) : null;

    if (allMovies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 text-center group hover:border-white/20 transition-colors">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Film className="text-slate-500 group-hover:text-sky-400 transition-colors" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">Your list is empty</h3>
                <p className="text-slate-400 max-w-xs mx-auto">
                    Search for movies above to start building your collection.
                </p>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-8">
                {/* Top 10 Section */}
                <DroppableSection id="ranked-items-top10" className="space-y-3">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-yellow-500">🏆</span> Top 10
                    </h3>

                    <SortableContext
                        id="ranked-items-top10"
                        items={rankedMovies.slice(0, 10).map(m => m.uniqueId)}
                        strategy={verticalListSortingStrategy}
                    >
                        {rankedMovies.slice(0, 10).length === 0 ? (
                            <DroppableEmptyZone />
                        ) : (
                            rankedMovies.slice(0, 10).map((movie, index) => (
                                <MovieCard
                                    key={movie.uniqueId}
                                    movie={movie}
                                    index={index}
                                    listId={listId}
                                    onRemove={removeMovie}
                                    variant="top10"
                                />
                            ))
                        )}
                    </SortableContext>
                </DroppableSection>

                {/* 11-20 Section */}
                {rankedMovies.length > 10 && (
                    <DroppableSection id="ranked-items-honorable" className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-300 mb-4 mt-8">Honorable Mentions (11-20)</h3>
                        <SortableContext
                            id="ranked-items-honorable"
                            items={rankedMovies.slice(10, 20).map(m => m.uniqueId)}
                            strategy={verticalListSortingStrategy}
                        >
                            {rankedMovies.slice(10, 20).map((movie, index) => (
                                <MovieCard
                                    key={movie.uniqueId}
                                    movie={movie}
                                    index={index + 10}
                                    listId={listId}
                                    onRemove={removeMovie}
                                    variant="muted"
                                />
                            ))}
                        </SortableContext>
                    </DroppableSection>
                )}

                {/* 21+ Section */}
                {rankedMovies.length > 20 && (
                    <DroppableSection id="ranked-items-21plus" className="space-y-3">
                        <button
                            onClick={() => setExpanded21Plus(!expanded21Plus)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-full py-2"
                        >
                            <span className="text-lg font-bold">Ranks 21+</span>
                            <span className="text-xs bg-slate-800 px-2 py-1 rounded-full">{rankedMovies.length - 20} movies</span>
                            <span className={`transform transition-transform ${expanded21Plus ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {expanded21Plus && (
                            <SortableContext
                                id="ranked-items-21plus"
                                items={rankedMovies.slice(20).map(m => m.uniqueId)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {rankedMovies.slice(20).map((movie, index) => (
                                        <MovieCard
                                            key={movie.uniqueId}
                                            movie={movie}
                                            index={index + 20}
                                            listId={listId}
                                            onRemove={removeMovie}
                                            variant="muted"
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        )}
                    </DroppableSection>
                )}

                {/* Unranked Section */}
                {unrankedMovies.length > 0 && (
                    <DroppableSection id="unranked-items" className="space-y-3 pt-8 border-t border-white/10">
                        <button
                            onClick={() => setExpandedUnranked(!expandedUnranked)}
                            className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors w-full py-2"
                        >
                            <span className="text-lg font-bold">Unranked Collection</span>
                            <span className="text-xs bg-sky-500/10 px-2 py-1 rounded-full border border-sky-500/20">{unrankedMovies.length} movies</span>
                            <span className={`transform transition-transform ${expandedUnranked ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {expandedUnranked && (
                            <>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Filter unranked movies..."
                                        value={unrankedSearch}
                                        onChange={(e) => setUnrankedSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:bg-slate-800/80 transition-colors"
                                    />
                                </div>

                                <SortableContext
                                    id="unranked-items"
                                    items={filteredUnrankedMovies.map(m => m.uniqueId)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                        {filteredUnrankedMovies.length > 0 ? (
                                            filteredUnrankedMovies.map((movie) => (
                                                <MovieCard
                                                    key={movie.uniqueId}
                                                    movie={movie}
                                                    index={-1}
                                                    listId={listId}
                                                    onRemove={removeMovie}
                                                    variant="unranked"
                                                />
                                            ))
                                        ) : (
                                            <p className="text-slate-500 text-sm italic py-4">
                                                No movies match "{unrankedSearch}"
                                            </p>
                                        )}
                                    </div>
                                </SortableContext>
                            </>
                        )}
                    </DroppableSection>
                )}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <DragOverlay dropAnimation={null} style={{ zIndex: 9999 }}>
                    {activeMovie ? (
                        <MovieCardOverlay
                            movie={activeMovie}
                            variant="default"
                            className="opacity-90 shadow-2xl cursor-grabbing"
                        />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};
