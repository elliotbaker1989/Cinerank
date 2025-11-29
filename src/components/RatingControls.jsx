import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const RatingControls = ({ movieId, userRating, onRate, size = 20, className = '' }) => {
    const { showToast } = useToast();
    const [animatingBtn, setAnimatingBtn] = useState(null);

    const handleRate = (e, rating) => {
        e.stopPropagation();

        // Trigger animation
        setAnimatingBtn(rating);
        setTimeout(() => setAnimatingBtn(null), 300);

        // Check if we are removing the rating (toggling off)
        const isRemoving = userRating === rating;

        if (isRemoving) {
            onRate(movieId, null);
            showToast({
                message: 'Removed movie rating',
                type: 'info',
                icon: <Info size={18} className="text-sky-400" />
            });
            return;
        }

        onRate(movieId, rating);

        // Show toast for new rating
        const messages = {
            'double_up': 'You loved this movie!',
            'up': 'You liked this movie',
            'down': 'You disliked this movie'
        };

        const types = {
            'double_up': 'love',
            'up': 'like',
            'down': 'dislike'
        };

        showToast(messages[rating], types[rating]);
    };

    return (
        <div className={`flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg ${className}`}>
            {/* Double Thumbs Up */}
            <button
                onClick={(e) => handleRate(e, 'double_up')}
                className={`
                    group relative p-2 rounded-full transition-all duration-300
                    ${userRating === 'double_up' ? 'text-purple-500 bg-white/10' : 'text-slate-400 hover:text-purple-500 hover:bg-white/5'}
                    ${animatingBtn === 'double_up' ? 'scale-125' : ''}
                `}
                title="Love it!"
            >
                <div className="flex items-center -space-x-2">
                    <ThumbsUp size={size} className={`transform -rotate-12 transition-transform ${userRating === 'double_up' ? 'scale-110' : 'group-hover:scale-110'}`} fill={userRating === 'double_up' ? "currentColor" : "none"} />
                    <ThumbsUp size={size} className={`transform rotate-6 transition-transform ${userRating === 'double_up' ? 'scale-110' : 'group-hover:scale-110'}`} fill={userRating === 'double_up' ? "currentColor" : "none"} />
                </div>
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Thumbs Up */}
            <button
                onClick={(e) => handleRate(e, 'up')}
                className={`
                    p-2 rounded-full transition-all duration-300
                    ${userRating === 'up' ? 'text-green-400 bg-white/10' : 'text-slate-400 hover:text-green-400 hover:bg-white/5'}
                    ${animatingBtn === 'up' ? 'scale-125' : ''}
                `}
                title="Like it"
            >
                <ThumbsUp size={size} fill={userRating === 'up' ? "currentColor" : "none"} />
            </button>

            {/* Thumbs Down */}
            <button
                onClick={(e) => handleRate(e, 'down')}
                className={`
                    p-2 rounded-full transition-all duration-300
                    ${userRating === 'down' ? 'text-red-400 bg-white/10' : 'text-slate-400 hover:text-red-400 hover:bg-white/5'}
                    ${animatingBtn === 'down' ? 'scale-125' : ''}
                `}
                title="Not for me"
            >
                <ThumbsDown size={size} fill={userRating === 'down' ? "currentColor" : "none"} />
            </button>
        </div>
    );
};

export default RatingControls;
