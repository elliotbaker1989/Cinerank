import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

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
                if (data.lists) setLists(data.lists);
                if (data.ratings) setRatings(data.ratings);
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
                await setDoc(doc(db, 'users', user.uid), {
                    lists,
                    ratings
                }, { merge: true });
            } catch (error) {
                console.error("Error saving to Firestore:", error);
            }
        };
        // Debounce could be good here, but for now simple effect
        const timeoutId = setTimeout(saveToFirestore, 1000);
        return () => clearTimeout(timeoutId);
    }, [lists, ratings, user]);

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
            reorderList,
            ratings,
            rateMovie,
            getMovieRating
        }}>
            {children}
        </MovieContext.Provider>
    );
};
