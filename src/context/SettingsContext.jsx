import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    // Initialize from localStorage or default to 'TMDB'
    const [likesSource, setLikesSource] = useState(() => {
        const saved = localStorage.getItem('cinerank_likes_source');
        return saved || 'TMDB';
    });

    // Update localStorage when setting changes
    useEffect(() => {
        localStorage.setItem('cinerank_likes_source', likesSource);
    }, [likesSource]);

    const value = {
        likesSource,
        setLikesSource
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
