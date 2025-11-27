import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMovies, getTrendingMovies } from '../api';

// Mock fetch
global.fetch = vi.fn();

describe('API Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env vars mock if needed, but for now we test the logic based on fetch calls
    });

    it('returns mock data when API key is missing (simulated by fetch failure or logic)', async () => {
        // Simulate fetch failure to trigger mock data fallback
        fetch.mockRejectedValueOnce(new Error('API Error'));

        const results = await searchMovies('Inception');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Inception');
    });

    it('returns mock data for trending movies on failure', async () => {
        fetch.mockRejectedValueOnce(new Error('API Error'));

        const results = await getTrendingMovies();
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBeDefined();
    });

    it('calls fetch with correct URL when API key is present', async () => {
        // We can't easily mock import.meta.env in Vitest without complex setup, 
        // so we'll assume the env vars are set from our previous step or the test environment.
        // If they are set, fetch should be called.

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [] }),
        });

        await searchMovies('Test');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toContain('https://api.themoviedb.org/3/search/movie');
    });
});
