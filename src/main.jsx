import React from 'react' // Trigger HMR
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { MovieProvider } from './context/MovieContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'

import { BrowserRouter } from 'react-router-dom'

import AuthErrorBoundary from './components/AuthErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AuthErrorBoundary>
            <MovieProvider>
              <App />
            </MovieProvider>
          </AuthErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
