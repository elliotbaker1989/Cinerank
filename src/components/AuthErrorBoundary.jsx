import React from 'react';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from './ErrorBoundary';

const AuthErrorBoundary = ({ children }) => {
    const { realUser } = useAuth();
    const isSuperAdmin = realUser?.email === 'elbak89@gmail.com';

    return (
        <ErrorBoundary isAdmin={isSuperAdmin}>
            {children}
        </ErrorBoundary>
    );
};

export default AuthErrorBoundary;
