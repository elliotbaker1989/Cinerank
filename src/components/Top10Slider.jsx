import React, { useEffect, useState } from 'react';
import { getTrendingMovies } from '../services/api';
import { PosterMovieCard } from './PosterMovieCard';
import { useAuth } from '../context/AuthContext';
import { TrendingUp } from 'lucide-react';

export const Top10Slider = ({ availability, activeProviderFilters }) => {
    const { selectedRegion } = useAuth();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                // 1. Fetch basic list immediately (FAST)
                const basicTrending = await getTrendingMovies(selectedRegion, false);
                setMovies(basicTrending);
                setLoading(false); // Show content immediately

                // 2. Fetch enriched data (providers) in background (SLOW)
                const enrichedTrending = await getTrendingMovies(selectedRegion, true);
                setMovies(enrichedTrending);
            } catch (error) {
                console.error("Failed to fetch top 10:", error);
                setLoading(false);
            }
        };

        fetchTrending();
    }, [selectedRegion]);

    const { selectedProviders } = useAuth();

    // Filter movies based on availability settings
    const filteredMovies = movies.filter(movie => {
        // If not in subscription mode, show all
        if (!availability?.subs) return true;

        // If specific provider filters are active
        if (activeProviderFilters && activeProviderFilters.length > 0) {
            return movie.providers?.some(p => activeProviderFilters.includes(p.id));
        }

        // If activeProviderFilters is empty but we are in subs mode, 
        // it means user unselected everything (or hasn't selected anything yet, but default is all).
        // Based on "select all by default" logic, empty array means "show nothing".
        return false;
    }).slice(0, 10);

    const sliderRef = React.useRef(null);

    useEffect(() => {
        if (sliderRef.current) {
            sliderRef.current.scrollLeft = 0;
        }
    }, [filteredMovies]);

    if (loading || filteredMovies.length === 0) return null;

    return (
        <div className="w-full space-y-4 animate-fade-in pl-4 md:pl-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-sky-400" size={24} />
                {availability?.subs ? 'Trending on Your Subscriptions' : 'Top 10 Trending This Week'}
            </h3>

            <div
                ref={sliderRef}
                className="flex overflow-x-auto overflow-y-hidden gap-6 pb-12 pt-4 px-12 snap-x scroll-pl-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {filteredMovies.map((movie, index) => (
                    <div
                        key={movie.uniqueId}
                        className="relative flex-none w-[160px] md:w-[200px] snap-start group perspective-1000"
                    >
                        {/* Rank Number - Big and Bold */}
                        <div className="absolute -left-4 -bottom-6 text-[100px] font-black text-transparent stroke-text-white z-20 pointer-events-none drop-shadow-lg leading-none select-none font-outline-2">
                            {index + 1}
                        </div>

                        {/* Card Wrapper with Glow */}
                        <div className="relative transform transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] rounded-xl">
                            <PosterMovieCard movie={movie} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
