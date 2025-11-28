import fetch from 'node-fetch';

const API_KEY = "11c9966555e52e59714a7e13292a196f"; // Hardcoding for debug script only
const BASE_URL = "https://api.themoviedb.org/3";

const fetchProviders = async () => {
    const url = `${BASE_URL}/movie/967941/watch/providers?api_key=${API_KEY}`;
    console.log("Fetching:", url);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("US Providers:", JSON.stringify(data.results?.US, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
};

fetchProviders();
