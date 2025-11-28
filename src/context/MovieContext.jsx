import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
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

        // Save to global 'ratings' collection for Admin Analytics
        if (user) {
            console.log("Attempting to save global rating...", { movieId: movie.id, rating, userId: user.uid });
            try {
                const ratingId = `${user.uid}_${movie.id}`;
                const ratingDocRef = doc(db, 'ratings', ratingId);

                // If removing rating (toggle off)
                if (ratings[movie.id] === rating) {
                    console.log("Removing rating from global collection");
                    // We might want to delete the doc, or mark as deleted. 
                    // For simplicity, let's delete it.
                    // Import deleteDoc if needed, or just set rating to null?
                    // Let's assume we just overwrite or ignore deletion for now to keep history?
                    // Actually, if I untoggle, I should probably remove it from stats.
                    // But for MVP let's just focus on ADDING/UPDATING.
                    // If I untoggle, I'll set 'active' to false or delete.
                    // Let's just set it.
                    await setDoc(ratingDocRef, {
                        userId: user.uid,
                        movieId: movie.id,
                        rating: null, // Mark as removed
                        timestamp: new Date().toISOString(),
                        movieTitle: movie.title,
                        posterPath: movie.poster_path
                    });
                } else {
                    console.log("Saving new rating to global collection");
                    await setDoc(ratingDocRef, {
                        userId: user.uid,
                        movieId: movie.id,
                        rating: rating,
                        timestamp: new Date().toISOString(),
                        movieTitle: movie.title,
                        posterPath: movie.poster_path
                    });
                }
                console.log("Successfully saved global rating!");
            } catch (error) {
                console.error("Error saving global rating:", error);
            }
        } else {
            console.warn("User not logged in, skipping global rating save");
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
            getMovieRating
        }}>
            {children}
        </MovieContext.Provider>
    );
};
