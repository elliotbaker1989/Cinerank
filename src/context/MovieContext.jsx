import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, deleteDoc, deleteField } from 'firebase/firestore';
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

    const [watched, setWatched] = useState(() => {
        const saved = localStorage.getItem('cinerank-watched');
        return saved ? JSON.parse(saved) : {};
    });

    // Refs to track current state for onSnapshot comparison and immediate saves
    const listsRef = useRef(lists);
    const ratingsRef = useRef(ratings);
    const watchedRef = useRef(watched);

    useEffect(() => {
        listsRef.current = lists;
        ratingsRef.current = ratings;
        watchedRef.current = watched;
    }, [lists, ratings, watched]);

    // Sync with Firestore when User logs in
    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Use refs to compare with CURRENT state, not stale closure state
                if (data.lists && JSON.stringify(data.lists) !== JSON.stringify(listsRef.current)) {
                    setLists(data.lists);
                }
                if (data.ratings && JSON.stringify(data.ratings) !== JSON.stringify(ratingsRef.current)) {
                    setRatings(data.ratings);
                }
                if (data.watched && JSON.stringify(data.watched) !== JSON.stringify(watchedRef.current)) {
                    setWatched(data.watched);
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

    useEffect(() => {
        localStorage.setItem('cinerank-watched', JSON.stringify(watched));
    }, [watched]);

    // Debounced save for bulk updates (backup)
    useEffect(() => {
        if (!user) return;
        const saveToFirestore = async () => {
            try {
                const sanitizedLists = lists ? JSON.parse(JSON.stringify(lists)) : {};
                const sanitizedRatings = ratings ? JSON.parse(JSON.stringify(ratings)) : {};
                const sanitizedWatched = watched ? JSON.parse(JSON.stringify(watched)) : {};

                await setDoc(doc(db, 'users', user.uid), {
                    lists: sanitizedLists,
                    ratings: sanitizedRatings,
                    watched: sanitizedWatched
                }, { merge: true });
            } catch (error) {
                console.error("Error saving to Firestore:", error);
            }
        };
        const timeoutId = setTimeout(saveToFirestore, 2000); // Increased debounce since we have immediate saves
        return () => clearTimeout(timeoutId);
    }, [lists, ratings, watched, user]);

    // ... (addMovie, removeMovie, etc. - keep existing logic but maybe add immediate save if needed later)
    // For now, we focus on toggleWatched and rateMovie as requested.

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

            // 2. Add to 'all-time' (default) - ONLY if not adding to watchlist
            if (targetListId !== 'watchlist') {
                addToList('all-time');
            }

            // 3. Add to matching genre lists - ONLY if not adding to watchlist
            if (targetListId !== 'watchlist' && movie.genres) {
                movie.genres.forEach(genre => {
                    const mappedListId = GENRE_ID_MAP[genre.name];
                    if (mappedListId) {
                        addToList(mappedListId);
                    }
                });
            }

            return newLists;
        });

        // Save to global collections for Admin Analytics
        if (user) {
            const saveToGlobal = async () => {
                try {
                    // If adding to Watchlist
                    if (targetListId === 'watchlist') {
                        const docRef = doc(db, 'watchlists', `${user.uid}_${movie.id}`);
                        await setDoc(docRef, {
                            userId: user.uid,
                            movieId: movie.id,
                            movieTitle: movie.title,
                            posterPath: movie.poster_path,
                            timestamp: new Date().toISOString()
                        });
                    }
                    // If adding to Rankings (not watchlist)
                    else {
                        const docRef = doc(db, 'rankings', `${user.uid}_${movie.id}`);
                        await setDoc(docRef, {
                            userId: user.uid,
                            movieId: movie.id,
                            movieTitle: movie.title,
                            posterPath: movie.poster_path,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error("Error saving to global collection:", error);
                }
            };
            saveToGlobal();
        }
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

        // Remove from global collections if logged in
        if (user && removedMovie) {
            const removeFromGlobal = async () => {
                try {
                    // If removing from Watchlist
                    if (listId === 'watchlist') {
                        const docRef = doc(db, 'watchlists', `${user.uid}_${removedMovie.id}`);
                        await deleteDoc(docRef);
                    }
                    // If removing from Rankings (all-time)
                    else if (listId === 'all-time') {
                        const docRef = doc(db, 'rankings', `${user.uid}_${removedMovie.id}`);
                        await deleteDoc(docRef);
                    }
                } catch (error) {
                    console.error("Error removing from global collection:", error);
                }
            };
            removeFromGlobal();
        }

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

    const rateMovie = async (movie, rating) => {
        // Optimistic update for local state
        setRatings(prev => {
            if (prev[movie.id] === rating) {
                const newRatings = { ...prev };
                delete newRatings[movie.id];
                return newRatings;
            }
            return {
                ...prev,
                [movie.id]: rating
            };
        });

        if (user) {
            try {
                // 1. Save to global 'ratings' collection
                const ratingId = `${user.uid}_${movie.id}`;
                const ratingDocRef = doc(db, 'ratings', ratingId);

                if (ratingsRef.current[movie.id] === rating) {
                    // Toggle off
                    await setDoc(ratingDocRef, {
                        userId: user.uid,
                        movieId: movie.id,
                        rating: null,
                        timestamp: new Date().toISOString(),
                        movieTitle: movie.title,
                        posterPath: movie.poster_path
                    });
                } else {
                    // New rating
                    await setDoc(ratingDocRef, {
                        userId: user.uid,
                        movieId: movie.id,
                        rating: rating,
                        timestamp: new Date().toISOString(),
                        movieTitle: movie.title,
                        posterPath: movie.poster_path
                    });
                }

                // 2. IMMEDIATE SYNC to users/{uid} using ATOMIC updates
                if (ratingsRef.current[movie.id] === rating) {
                    // Removing rating
                    await setDoc(doc(db, 'users', user.uid), {
                        ratings: {
                            [movie.id]: deleteField()
                        }
                    }, { merge: true });
                } else {
                    // Adding/Updating rating
                    await setDoc(doc(db, 'users', user.uid), {
                        ratings: {
                            [movie.id]: rating
                        }
                    }, { merge: true });
                }

            } catch (error) {
                console.error("Error saving rating:", error);
            }
        }
    };

    const toggleWatched = async (movie) => {
        const isWatched = !!watched[movie.id];
        const newStatus = !isWatched;

        // Optimistic update
        setWatched(prev => {
            const newState = { ...prev };
            if (newStatus) {
                newState[movie.id] = new Date().toISOString();
            } else {
                delete newState[movie.id];
            }
            return newState;
        });

        if (user) {
            try {
                // 1. Global Sync (watched collection)
                const docId = `${user.uid}_${movie.id}`;
                const docRef = doc(db, 'watched', docId);

                if (newStatus) {
                    await setDoc(docRef, {
                        userId: user.uid,
                        movieId: movie.id,
                        movieTitle: movie.title,
                        posterPath: movie.poster_path,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    await deleteDoc(docRef);
                }

                // 2. IMMEDIATE SYNC to users/{uid} using ATOMIC updates
                if (newStatus) {
                    await setDoc(doc(db, 'users', user.uid), {
                        watched: {
                            [movie.id]: new Date().toISOString()
                        }
                    }, { merge: true });
                } else {
                    await setDoc(doc(db, 'users', user.uid), {
                        watched: {
                            [movie.id]: deleteField()
                        }
                    }, { merge: true });
                }

            } catch (error) {
                console.error("Error syncing watched status:", error);
            }
        }
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
            getMovieRating,
            watched,
            toggleWatched
        }}>
            {children}
        </MovieContext.Provider>
    );
};
