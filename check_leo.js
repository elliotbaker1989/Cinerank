import fs from 'fs';
import path from 'path';

// Read .env manually
const envPath = path.resolve('C:/Users/ellio/.gemini/antigravity/scratch/cinerank/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/VITE_TMDB_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

const BASE_URL = "https://api.themoviedb.org/3";

const fetchFromTMDB = async (endpoint) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append("api_key", apiKey);
    const response = await fetch(url.toString());
    return await response.json();
};

const checkLeo = async () => {
    console.log("Fetching credits for Leo...");
    const data = await fetchFromTMDB(`/person/6193/movie_credits`);

    const ozi = data.cast.find(m => m.title.includes('Ozi'));
    const oziCrew = data.crew.filter(m => m.title.includes('Ozi'));

    console.log("Ozi Cast Entry:", JSON.stringify(ozi, null, 2));
    console.log("Ozi Crew Entry:", JSON.stringify(oziCrew, null, 2));
};

checkLeo();
