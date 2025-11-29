import { Film, Zap, Smile, Heart, Rocket, Skull, Ghost, Camera, User, Sparkles } from 'lucide-react';

export const GENRES = [
    { id: 'all-time', label: 'All-Time', icon: Film },
    { id: 'actors', label: 'Actors', icon: User },
    { id: 'action', label: 'Action', icon: Zap },
    { id: 'comedy', label: 'Comedy', icon: Smile },
    { id: 'drama', label: 'Drama', icon: Heart },
    { id: 'horror', label: 'Horror', icon: Skull },
    { id: 'scifi', label: 'Sci-Fi', icon: Rocket },
    { id: 'animation', label: 'Animation', icon: Sparkles },
    { id: 'romance', label: 'Romance', icon: Heart },
    { id: 'thriller', label: 'Thriller', icon: Ghost },
    { id: 'documentary', label: 'Documentary', icon: Camera },
];

// Map TMDB genre names to our internal list IDs
export const GENRE_ID_MAP = {
    'Action': 'action',
    'Adventure': 'action', // Map Adventure to Action
    'Animation': 'animation',
    'Comedy': 'comedy',
    'Drama': 'drama',
    'Horror': 'horror',
    'Science Fiction': 'scifi',
    'Romance': 'romance',
    'Thriller': 'thriller',
    'Documentary': 'documentary',
    'Crime': 'thriller', // Map Crime to Thriller
    'Mystery': 'thriller', // Map Mystery to Thriller
    'Fantasy': 'scifi', // Map Fantasy to Sci-Fi
    'War': 'action', // Map War to Action
};
