import React, { createContext, useContext, useState, useEffect } from 'react';

const MovieContext = createContext();

export const useMovieContext = () => useContext(MovieContext);

const INITIAL_LISTS = {
    'all-time': [],
    'watchlist': [],
    'action': [],
    'comedy': [],
    'drama': [],
    'horror': [],
    'scifi': [],
    'romance': [],
    'thriller': [],
    'documentary': [],
};

export const MovieProvider = ({ children }) => {
    // Load from local storage or use initial state
    const [lists, setLists] = useState(() => {
        const saved = localStorage.getItem('cinerank-lists');
        return saved ? JSON.parse(saved) : INITIAL_LISTS;
    });

    const [activeListId, setActiveListId] = useState('all-time');

    useEffect(() => {
        localStorage.setItem('cinerank-lists', JSON.stringify(lists));
    }, [lists]);

    const addMovie = (listId, movie) => {
        setLists(prev => {
            const list = prev[listId] || [];
            if (list.some(m => m.id === movie.id)) return prev; // No duplicates
            if (list.length >= 10) {
                alert("List is full! Remove a movie first."); // Simple feedback for now
                return prev;
            }
            return {
                ...prev,
                [listId]: [...list, { ...movie, uniqueId: crypto.randomUUID() }] // Add uniqueId for dnd
            };
        });
    };

    const removeMovie = (listId, movieId) => {
        setLists(prev => ({
            ...prev,
            [listId]: prev[listId].filter(m => m.id !== movieId)
        }));
    };

    const reorderList = (listId, newOrder) => {
        setLists(prev => ({
            ...prev,
            [listId]: newOrder
        }));
    };

    return (
        <MovieContext.Provider value={{
            lists,
            activeListId,
            setActiveListId,
            addMovie,
            removeMovie,
            reorderList
        }}>
            {children}
        </MovieContext.Provider>
    );
};
