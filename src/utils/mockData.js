
// Deterministic random number generator based on a seed (e.g., ID)
const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const getMovieStats = (movie) => {
    // Handle both full movie object and legacy ID passing
    const movieId = typeof movie === 'object' ? movie.id : movie;
    const seed = parseInt(movieId) || 0;
    const rand = seededRandom(seed);

    // Use vote_count as a proxy for "success/reach" if available
    // Fallback to popularity, then random
    let score = 0;
    if (typeof movie === 'object') {
        if (movie.vote_count) score = movie.vote_count;
        else if (movie.popularity) score = movie.popularity * 50; // Rough conversion
    }

    // If no score (legacy call), use random to simulate
    if (score === 0) score = rand * 5000;

    // Determine Tier based on Score (Vote Count)
    // > 10,000: Mega Blockbuster (Avatar, Avengers)
    // > 3,000: Blockbuster
    // > 1,000: Hit
    // > 100: Moderate
    // < 100: Indie/Direct-to-Video

    let budgetRange, revenueMultiplier;

    if (score > 10000) {
        // Mega Blockbuster
        budgetRange = [150, 350];
        revenueMultiplier = 3.5 + (seededRandom(seed + 1) * 6); // 3.5x - 9.5x (Huge returns)
    } else if (score > 3000) {
        // Blockbuster
        budgetRange = [80, 200];
        revenueMultiplier = 2.5 + (seededRandom(seed + 1) * 4); // 2.5x - 6.5x
    } else if (score > 1000) {
        // Hit
        budgetRange = [30, 100];
        revenueMultiplier = 1.5 + (seededRandom(seed + 1) * 3.5); // 1.5x - 5x
    } else if (score > 100) {
        // Moderate
        budgetRange = [10, 50];
        revenueMultiplier = 0.8 + (seededRandom(seed + 1) * 2.5); // 0.8x - 3.3x (Risk of flop)
    } else {
        // Indie / Obscure
        budgetRange = [1, 15];
        revenueMultiplier = 0.1 + (seededRandom(seed + 1) * 1.5); // 0.1x - 1.6x (High risk of flop)
    }

    // Calculate Budget
    const budget = budgetRange[0] + Math.floor(rand * (budgetRange[1] - budgetRange[0]));

    // Calculate Revenue
    // Add some randomness to the multiplier based on a second seed
    const variance = seededRandom(seed + 2) * 0.4 - 0.2; // +/- 20% variance
    const finalMultiplier = Math.max(0.1, revenueMultiplier + variance);

    const revenue = budget * finalMultiplier;

    return {
        budget: Math.round(budget), // In Millions
        revenue: parseFloat(revenue.toFixed(1)) // In Millions
    };
};

export const generateActorAwards = (personId, popularity = 50, movieCredits = []) => {
    const seed = typeof personId === 'number' ? personId : parseInt(personId) || 0;
    const rand = seededRandom(seed);

    // Filter for "Award Worthy" movies (High rating or high popularity)
    // If no credits provided, fallback to generic logic
    const awardWorthyMovies = movieCredits.filter(m => m.vote_average >= 7.0 || m.popularity > 50);
    const hasGoodMovies = awardWorthyMovies.length > 0;

    // Determine number of awards
    // Increase base count for high popularity
    let numAwards = 0;
    if (popularity > 80) numAwards = 5 + Math.floor(rand * 8); // 5-12 awards (Increased)
    else if (popularity > 40) numAwards = 2 + Math.floor(rand * 4); // 2-5 awards
    else numAwards = Math.floor(rand * 2); // 0-1 awards

    if (numAwards === 0 && rand > 0.8) numAwards = 1; // Lucky break

    const awardTypes = [
        "Oscar Winner",
        "Oscar Nominee",
        "Golden Globe Winner",
        "Golden Globe Nominee",
        "BAFTA Winner",
        "BAFTA Nominee",
        "Emmy Winner",
        "Emmy Nominee",
        "SAG Award Winner",
        "Cannes Best Actor",
        "Critics Choice Award",
        "People's Choice Award",
        "MTV Movie Award",
        "Saturn Award"
    ];

    const awardsMap = new Map();

    for (let i = 0; i < numAwards; i++) {
        const awardIndex = Math.floor(seededRandom(seed + i + 10) * awardTypes.length);
        const awardName = awardTypes[awardIndex];

        // Pick a movie for this award
        let movie = null;
        let year = null;
        if (hasGoodMovies) {
            const movieIndex = Math.floor(seededRandom(seed + i + 50) * awardWorthyMovies.length);
            const selectedMovie = awardWorthyMovies[movieIndex];
            movie = selectedMovie.title;
            year = selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : null;
        }

        if (!awardsMap.has(awardName)) {
            awardsMap.set(awardName, { name: awardName, count: 0, details: [] });
        }

        const awardEntry = awardsMap.get(awardName);
        awardEntry.count += 1;
        if (movie) {
            // Avoid duplicate movie entries for the same award type if possible, or just list them
            awardEntry.details.push({ movie, year });
        }
    }

    const awards = Array.from(awardsMap.values());

    // Sort: Winners first, then Nominees, then by count
    return awards.sort((a, b) => {
        const aScore = (a.name.includes("Winner") ? 100 : 0) + a.count;
        const bScore = (b.name.includes("Winner") ? 100 : 0) + b.count;
        return bScore - aScore;
    });
};
