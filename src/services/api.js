const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;
const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
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
    vote_count: movie.vote_count,
    popularity: movie.popularity,
    genre_ids: movie.genre_ids,
    overview: movie.overview,
    uniqueId: movie.uniqueId || crypto.randomUUID(),
    character: movie.character,
    job: movie.job,
});

const getUniqueProviders = (providerData) => {
    if (!providerData?.results?.US) return [];

    const usProviders = providerData.results.US;
    const allProviders = [
        ...(usProviders.flatrate || []),
        ...(usProviders.rent || []),
        ...(usProviders.buy || [])
    ];

    const uniqueProviders = [];
    const seen = new Set();

    for (const p of allProviders) {
        if (!seen.has(p.provider_name)) {
            seen.add(p.provider_name);
            uniqueProviders.push({
                id: p.provider_id,
                name: p.provider_name,
                logo: p.logo_path ? `${IMAGE_BASE_URL}${p.logo_path}` : null,
                url: `https://www.google.com/search?q=watch+${encodeURIComponent(p.provider_name)}` // Placeholder URL logic
            });
        }
    }

    return uniqueProviders.slice(0, 3);
};

const mapMovieDetails = (movie) => ({
    ...mapMovie(movie),
    runtime: movie.runtime,
    genres: movie.genres || [],
    cinerank_score: Math.floor(Math.random() * (98 - 75) + 75), // Keep this as it's a "proprietary" score
    credits: {
        director: movie.credits?.crew?.find(c => c.job === "Director")?.name || "Unknown",
        cast: movie.credits?.cast?.slice(0, 6).map(c => ({
            id: c.id,
            name: c.name,
            role: c.role || c.character,
            image: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null
        })) || []
    },
    watch_providers: getUniqueProviders(movie["watch/providers"])
});

export const searchMovies = async (query) => {
    if (!query) return [];
    const data = await fetchFromTMDB("/search/movie", { query });
    return data?.results?.map(mapMovie) || [];
};

export const searchPeople = async (query) => {
    if (!query) return [];
    const data = await fetchFromTMDB("/search/person", { query });
    return data?.results?.map(person => ({
        id: person.id,
        name: person.name,
        image: person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : null,
        known_for: person.known_for?.map(m => m.title || m.name).join(', '),
        type: 'person'
    })) || [];
};

export const getTrendingMovies = async (region = 'US', fetchExtras = true) => {
    const data = await fetchFromTMDB("/trending/movie/week");
    const movies = data?.results || [];

    if (!fetchExtras) {
        return movies.map(mapMovie);
    }

    // Fetch providers and release dates for all movies in parallel
    const moviesWithExtras = await Promise.all(movies.map(async (movie) => {
        const [providerData, releaseData] = await Promise.all([
            fetchFromTMDB(`/movie/${movie.id}/watch/providers`),
            fetchFromTMDB(`/movie/${movie.id}/release_dates`)
        ]);

        const providers = getUniqueProviders(providerData);

        // Find release date for the selected region
        let regionReleaseDate = movie.release_date; // Default fallback
        if (releaseData?.results) {
            const regionData = releaseData.results.find(r => r.iso_3166_1 === region);
            if (regionData?.release_dates?.length > 0) {
                // Prefer theatrical release (type 3) or digital (type 4), otherwise first available
                const release = regionData.release_dates.find(d => d.type === 3) || regionData.release_dates[0];
                regionReleaseDate = release.release_date.split('T')[0];
            }
        }

        return { ...mapMovie(movie), providers, release_date: regionReleaseDate };
    }));

    return moviesWithExtras;
};

export const getMovieDetails = async (id, region = 'US') => {
    const data = await fetchFromTMDB(`/movie/${id}`, { append_to_response: "credits,watch/providers,videos,release_dates" });

    if (!data) return null;

    let regionReleaseDate = data.release_date;
    if (data.release_dates?.results) {
        const regionData = data.release_dates.results.find(r => r.iso_3166_1 === region);
        if (regionData?.release_dates?.length > 0) {
            const release = regionData.release_dates.find(d => d.type === 3) || regionData.release_dates[0];
            regionReleaseDate = release.release_date.split('T')[0];
        }
    }

    return { ...mapMovieDetails(data), release_date: regionReleaseDate };
};

export const getMovieVideos = async (id) => {
    const data = await fetchFromTMDB(`/movie/${id}/videos`);
    return data?.results || [];
};

export const getWatchProviders = async (region = 'US') => {
    const data = await fetchFromTMDB("/watch/providers/movie", { watch_region: region });
    return data?.results || [];
};

export const getMovieProviders = async (movieId) => {
    const data = await fetchFromTMDB(`/movie/${movieId}/watch/providers`);
    return getUniqueProviders(data);
};

export const getPersonDetails = async (personId) => {
    const data = await fetchFromTMDB(`/person/${personId}`);
    return data;
};

export const getPersonMovieCredits = async (personId) => {
    const data = await fetchFromTMDB(`/person/${personId}/movie_credits`);
    if (!data) return [];

    const movieMap = new Map();

    // Process Crew (Director, Producer) first to establish non-acting roles
    data.crew?.forEach(movie => {
        const job = movie.job;
        let role = null;

        if (job === 'Director') role = 'Director';
        else if (job === 'Producer' || job === 'Executive Producer') role = 'Producer';

        if (role) {
            if (!movieMap.has(movie.id)) {
                movieMap.set(movie.id, { ...mapMovie(movie), roles: [] });
            }
            const entry = movieMap.get(movie.id);
            if (!entry.roles.includes(role)) {
                entry.roles.push(role);
            }
        }
    });

    // Process Cast (Actors)
    data.cast?.forEach(movie => {
        if (!movieMap.has(movie.id)) {
            movieMap.set(movie.id, { ...mapMovie(movie), roles: [] });
        }
        const entry = movieMap.get(movie.id);

        // Check for invalid character names that shouldn't be counted as "Actor"
        const character = movie.character?.toLowerCase() || "";
        const invalidRoles = [
            "self", "himself", "herself", "archive footage", "archive sound",
            "thanks", "special thanks", "executive producer", "producer", "guest", "host"
        ];
        const isInvalidRole = invalidRoles.some(role => character.includes(role));

        // Check if they are already a Producer/Director and have NO character name (likely a data error)
        const isProducerOrDirector = entry.roles.includes('Producer') || entry.roles.includes('Director');
        const isEmptyCharacter = !movie.character || movie.character.trim() === "";

        // Only add Actor role if it's a valid acting credit
        if (!isInvalidRole && !(isProducerOrDirector && isEmptyCharacter)) {
            if (!entry.roles.includes('Actor')) {
                entry.roles.push('Actor');
            }
            // Keep the character name if it exists and isn't already set
            if (movie.character && !entry.character) {
                entry.character = movie.character;
            }
        }
    });

    return Array.from(movieMap.values());
};

export const getMoviesDetails = async (movieIds) => {
    // Limit concurrency to avoid rate limits
    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
        const batch = movieIds.slice(i, i + BATCH_SIZE);
        const promises = batch.map(id => fetchFromTMDB(`/movie/${id}`));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }

    return results.filter(Boolean);
};

export const getPersonTvCredits = async (personId) => {
    const data = await fetchFromTMDB(`/person/${personId}/tv_credits`);
    return data?.cast || [];
};

export const getPersonCollaborators = async (personId, movieCredits) => {
    if (!movieCredits || movieCredits.length === 0) return null;

    // Sort by vote_count to get significant movies
    // Increased limit to 60 to capture more collaborations (e.g. De Niro & Leo)
    const topMovies = [...movieCredits]
        .sort((a, b) => b.vote_count - a.vote_count)
        .slice(0, 60);

    // Batch requests to avoid rate limits
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < topMovies.length; i += BATCH_SIZE) {
        const batch = topMovies.slice(i, i + BATCH_SIZE);
        const promises = batch.map(movie => fetchFromTMDB(`/movie/${movie.id}/credits`));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);

        // Small delay between batches to be nice to the API
        if (i + BATCH_SIZE < topMovies.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    const directorStats = {};
    const costarStats = {};

    results.forEach((credits, index) => {
        if (!credits) return;
        const movieTitle = topMovies[index].title;

        // Directors
        const directors = credits.crew?.filter(c => c.job === "Director") || [];
        directors.forEach(d => {
            if (!directorStats[d.id]) {
                directorStats[d.id] = { count: 0, name: d.name, image: d.profile_path, movies: [] };
            }
            directorStats[d.id].count++;
            if (!directorStats[d.id].movies.includes(movieTitle)) {
                directorStats[d.id].movies.push(movieTitle);
            }
        });

        // Co-stars (top 10 billing to ensure main cast)
        const cast = credits.cast?.slice(0, 10) || [];
        cast.forEach(c => {
            if (c.id !== parseInt(personId)) { // Exclude self
                if (!costarStats[c.id]) {
                    costarStats[c.id] = { count: 0, name: c.name, image: c.profile_path, movies: [] };
                }
                costarStats[c.id].count++;
                if (!costarStats[c.id].movies.includes(movieTitle)) {
                    costarStats[c.id].movies.push(movieTitle);
                }
            }
        });
    });

    // Find top director
    let topDirector = null;
    Object.values(directorStats).forEach(d => {
        if (!topDirector || d.count > topDirector.count) topDirector = d;
    });

    // Find top co-star
    let topCostar = null;
    Object.values(costarStats).forEach(c => {
        if (!topCostar || c.count > topCostar.count) topCostar = c;
    });

    return {
        frequentDirector: topDirector,
        frequentCostar: topCostar
    };
};

export const discoverMovies = async ({
    page = 1,
    sort_by = 'popularity.desc',
    with_genres = '',
    with_watch_providers = '',
    watch_region = 'US',
    primary_release_date_gte = '',
    primary_release_date_lte = '',
    vote_count_gte = 100, // Basic filter to avoid junk
    with_people = '',
    fetchExtras = false
}) => {
    const params = {
        page,
        sort_by,
        'vote_count.gte': vote_count_gte,
        include_adult: false,
        include_video: false,
        language: 'en-US',
    };

    if (with_people) params.with_people = with_people;

    if (with_genres) params.with_genres = with_genres;
    if (with_watch_providers) {
        params.with_watch_providers = with_watch_providers;
        params.watch_region = watch_region;
    }
    if (primary_release_date_gte) params['primary_release_date.gte'] = primary_release_date_gte;
    if (primary_release_date_lte) params['primary_release_date.lte'] = primary_release_date_lte;
    if (params.with_people) params.with_people = params.with_people;

    // For "In Cinemas" we need to specify release types
    // 3 = Theatrical, 2 = Limited Theatrical
    if (primary_release_date_gte || primary_release_date_lte) {
        params.with_release_type = '2|3';
    }

    console.log("Discover Params:", params);

    const data = await fetchFromTMDB("/discover/movie", params);
    const movies = data?.results || [];

    if (!fetchExtras) {
        return movies.map(mapMovie);
    }

    // Fetch extras (providers, release dates) in parallel for the grid
    const moviesWithExtras = await Promise.all(movies.map(async (movie) => {
        // We can optimize this by NOT fetching providers if we already filtered by them,
        // but we still want to show *all* providers for the movie card.
        // However, for performance on a grid, maybe we skip full provider fetch per card?
        // The user wants "On My Subscriptions" to work, so we know they have it.
        // But the card UI might show icons.
        // Let's keep it simple and fetch extras for now, but maybe limit concurrency if needed.
        // Actually, for infinite scroll grid, fetching 20 * 2 requests per page is heavy.
        // Let's just map the basic movie data first. If the card needs providers, it should fetch them or we accept the load.
        // Given the "TrendingSlider" does it, we should probably do it to maintain UI consistency.

        const [providerData, releaseData] = await Promise.all([
            fetchFromTMDB(`/movie/${movie.id}/watch/providers`),
            fetchFromTMDB(`/movie/${movie.id}/release_dates`)
        ]);

        const providers = getUniqueProviders(providerData);

        let regionReleaseDate = movie.release_date;
        if (releaseData?.results) {
            const regionData = releaseData.results.find(r => r.iso_3166_1 === watch_region);
            if (regionData?.release_dates?.length > 0) {
                const release = regionData.release_dates.find(d => d.type === 3) || regionData.release_dates[0];
                regionReleaseDate = release.release_date.split('T')[0];
            }
        }

        return { ...mapMovie(movie), providers, release_date: regionReleaseDate };
    }));

    return moviesWithExtras;
};
