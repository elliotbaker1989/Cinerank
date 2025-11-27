# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Environment Setup

This project requires a TMDB API key to function correctly.

1.  Get a TMDB API key from [https://www.themoviedb.org/documentation/api](https://www.themoviedb.org/documentation/api).
2.  Create a `.env` file in the root directory.
3.  Add your API key to the `.env` file:
    ```env
    VITE_TMDB_API_KEY=your_api_key_here
    ```
    You can use `.env.example` as a template.

### Netlify Deployment

If you are deploying to Netlify:

1.  Go to your site settings in Netlify.
2.  Navigate to **Site configuration** > **Environment variables**.
3.  Add a new variable with Key `VITE_TMDB_API_KEY` and Value as your actual API key.

## Running the App

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Ensure you have set up your `.env` file as described above.
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:5173](http://localhost:5173) in your browser.
