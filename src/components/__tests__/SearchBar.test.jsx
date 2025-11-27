import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import { MovieContext } from '../../context/MovieContext';
import { BrowserRouter } from 'react-router-dom';
import * as api from '../../services/api';

// Mock API
vi.mock('../../services/api', () => ({
    searchMovies: vi.fn(),
}));

// Mock Context
const mockAddMovie = vi.fn();
const renderWithContext = (component) => {
    return render(
        <BrowserRouter>
            <MovieContext.Provider value={{ addMovie: mockAddMovie }}>
                {component}
            </MovieContext.Provider>
        </BrowserRouter>
    );
};

describe('SearchBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        renderWithContext(<SearchBar />);
        expect(screen.getByPlaceholderText('Search for movies...')).toBeInTheDocument();
    });

    it('updates input value', () => {
        renderWithContext(<SearchBar />);
        const input = screen.getByPlaceholderText('Search for movies...');
        fireEvent.change(input, { target: { value: 'Inception' } });
        expect(input.value).toBe('Inception');
    });

    it('calls searchMovies API after debounce', async () => {
        api.searchMovies.mockResolvedValue([
            { id: 1, title: 'Inception', release_date: '2010-07-15', poster_path: '/path.jpg' }
        ]);

        renderWithContext(<SearchBar />);
        const input = screen.getByPlaceholderText('Search for movies...');
        fireEvent.change(input, { target: { value: 'Inception' } });

        // Wait for debounce (300ms)
        await waitFor(() => {
            expect(api.searchMovies).toHaveBeenCalledWith('Inception');
        }, { timeout: 500 });

        // Check if results are displayed
        expect(await screen.findByText('Inception')).toBeInTheDocument();
    });

    it('does not search for short queries', async () => {
        renderWithContext(<SearchBar />);
        const input = screen.getByPlaceholderText('Search for movies...');
        fireEvent.change(input, { target: { value: 'A' } });

        await new Promise(r => setTimeout(r, 400));
        expect(api.searchMovies).not.toHaveBeenCalled();
    });
});
