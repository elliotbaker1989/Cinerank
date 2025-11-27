const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const IMAGE_BASE_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";

const fetchFromTMDB = async (endpoint, params = {}) => {
    const url = new URL(`${BASE_URL}${endpoint}`);

    const headers = {
        'Content-Type': 'application/json',
    };

    if (ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
    } else if (API_KEY) {
        url.searchParams.append("api_key", API_KEY);
    } else {
        console.error("TMDB API Key/Token is missing.");
        return null;
    }

    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const response = await fetch(url.toString(), { headers });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TMDB API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return await response.json();
    } catch (error) {
        console.error("API Request Failed:", error);
        return null;
    }
};

const mapMovie = (movie) => ({
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path ? (movie.poster_path.startsWith('http') ? movie.poster_path : `${IMAGE_BASE_URL}${movie.poster_path}`) : null,
    backdrop_path: movie.backdrop_path ? (movie.backdrop_path.startsWith('http') ? movie.backdrop_path : `${IMAGE_BASE_URL_ORIGINAL}${movie.backdrop_path}`) : null,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    genre_ids: movie.genre_ids,
    overview: movie.overview,
    uniqueId: movie.uniqueId || crypto.randomUUID(),
});

const mapMovieDetails = (movie) => ({
    ...mapMovie(movie),
    runtime: movie.runtime,
    genres: movie.genres || [],
    cinerank_score: Math.floor(Math.random() * (98 - 75) + 75), // Keep this as it's a "proprietary" score
    credits: {
        director: movie.credits?.crew?.find(c => c.job === "Director")?.name || "Unknown",
        cast: movie.credits?.cast?.slice(0, 6).map(c => ({
            name: c.name,
            role: c.role || c.character,
            image: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null
        })) || []
    },
    watch_providers: movie["watch/providers"]?.results?.US?.flatrate?.map(p => ({
        name: p.provider_name,
        logo: p.logo_path ? `${IMAGE_BASE_URL}${p.logo_path}` : null,
        url: `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}`
    })) || []
});

export const searchMovies = async (query) => {
    if (!query) return [];
    const data = await fetchFromTMDB("/search/movie", { query });
    return data?.results?.map(mapMovie) || [];
};

export const getTrendingMovies = async () => {
    const data = await fetchFromTMDB("/trending/movie/week");
    return data?.results?.map(mapMovie) || [];
};

export const getMovieDetails = async (id) => {
    const data = await fetchFromTMDB(`/movie/${id}`, { append_to_response: "credits,watch/providers,videos" });
    return data ? mapMovieDetails(data) : null;
};

export const getMovieVideos = async (id) => {
    const data = await fetchFromTMDB(`/movie/${id}/videos`);
    return data?.results || [];
};

