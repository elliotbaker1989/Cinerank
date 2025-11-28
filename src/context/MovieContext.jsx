import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { GENRE_ID_MAP } from '../utils/constants';

export const MovieContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useMovieContext = () => useContext(MovieContext);

const INITIAL_LISTS = {
    'all-time': [],
    'watchlist': [],
    'favorites': [],
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
    const { user } = useAuth();

    // Load from local storage or use initial state
    const [lists, setLists] = useState(() => {
        const saved = localStorage.getItem('cinerank-lists');
        return saved ? JSON.parse(saved) : INITIAL_LISTS;
    });

    const [activeListId, setActiveListId] = useState('all-time');

    const [ratings, setRatings] = useState(() => {
        const saved = localStorage.getItem('cinerank-ratings');
        return saved ? JSON.parse(saved) : {};
    });

    // Sync with Firestore when User logs in
    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Prevent infinite loop: only update if data actually changed
                if (data.lists && JSON.stringify(data.lists) !== JSON.stringify(lists)) {
                    setLists(data.lists);
                }
                if (data.ratings && JSON.stringify(data.ratings) !== JSON.stringify(ratings)) {
                    setRatings(data.ratings);
                }
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Save to Local Storage
    useEffect(() => {
        localStorage.setItem('cinerank-lists', JSON.stringify(lists));
    }, [lists]);

    useEffect(() => {
        localStorage.setItem('cinerank-ratings', JSON.stringify(ratings));
    }, [ratings]);

    // Save to Firestore when data changes (if logged in)
    useEffect(() => {
        if (!user) return;
        const saveToFirestore = async () => {
            try {
                // Sanitize data before saving
                const sanitizedLists = lists ? JSON.parse(JSON.stringify(lists)) : {};
                const sanitizedRatings = ratings ? JSON.parse(JSON.stringify(ratings)) : {};

                await setDoc(doc(db, 'users', user.uid), {
                    lists: sanitizedLists,
                    ratings: sanitizedRatings
                }, { merge: true });
            } catch (error) {
                console.error("Error saving to Firestore:", error);
            }
        };
        // Debounce could be good here, but for now simple effect
        const timeoutId = setTimeout(saveToFirestore, 1000);
        return () => clearTimeout(timeoutId);
    }, [lists, ratings, user]);

    const addMovie = (targetListId, movie) => {
        setLists(prev => {
            const newLists = { ...prev };
            const movieWithId = { ...movie, uniqueId: crypto.randomUUID(), unranked: true };

            // Helper to add to a specific list
            const addToList = (listId) => {
                const list = newLists[listId] || [];
                if (!list.some(m => m.id === movie.id)) {
                    newLists[listId] = [...list, movieWithId];
                }
            };

            // 1. Add to the specifically requested list (if any)
            if (targetListId) {
                addToList(targetListId);
            }

            // 2. Add to 'all-time' (default)
            addToList('all-time');

            // 3. Add to matching genre lists
            if (movie.genres) {
                movie.genres.forEach(genre => {
                    const mappedListId = GENRE_ID_MAP[genre.name];
                    if (mappedListId) {
                        addToList(mappedListId);
                    }
                });
            }

            return newLists;
        });
    };

    const moveToUnranked = (listId, movieId) => {
        setLists(prev => {
            const list = prev[listId] || [];
            const movieIndex = list.findIndex(m => m.uniqueId === movieId);
            if (movieIndex === -1) return prev;

            const newList = [...list];
            // Keep the same uniqueId but mark as unranked
            newList[movieIndex] = { ...newList[movieIndex], unranked: true };

            return {
                ...prev,
                [listId]: newList
            };
        });
    };

    const removeMovie = (listId, uniqueId) => {
        let removedMovie = null;
        setLists((prev) => {
            const list = prev[listId] || [];
            removedMovie = list.find(m => m.uniqueId === uniqueId);
            return {
                ...prev,
                [listId]: list.filter((movie) => movie.uniqueId !== uniqueId),
            };
        });
        return removedMovie;
    };

    const undoRemove = (listId, movie) => {
        if (!movie) return;
        setLists(prev => ({
            ...prev,
            [listId]: [...(prev[listId] || []), movie]
        }));
    };

    const undoMoveToUnranked = (listId, movieId) => {
        setLists(prev => {
            const list = prev[listId] || [];
            const movieIndex = list.findIndex(m => m.uniqueId === movieId);
            if (movieIndex === -1) return prev;

            const newList = [...list];
            newList[movieIndex] = { ...newList[movieIndex], unranked: false };

            return {
                ...prev,
                [listId]: newList
            };
        });
    };

    const reorderList = (listId, newOrder) => {
        setLists(prev => ({
            ...prev,
            [listId]: newOrder
        }));
    };

    const rateMovie = (movieId, rating) => {
        setRatings(prev => {
            // If clicking the same rating, toggle it off (remove rating)
            if (prev[movieId] === rating) {
                const newRatings = { ...prev };
                delete newRatings[movieId];
                return newRatings;
            }
            return {
                ...prev,
                [movieId]: rating
            };
        });
    };

    const getMovieRating = (movieId) => ratings[movieId];

    return (
        <MovieContext.Provider value={{
            lists,
            activeListId,
            setActiveListId,
            addMovie,
            removeMovie,
            moveToUnranked,
            undoRemove,
            undoMoveToUnranked,
            reorderList,
            ratings,
            rateMovie,
            getMovieRating
        }}>
            {children}
        </MovieContext.Provider>
    );
};
