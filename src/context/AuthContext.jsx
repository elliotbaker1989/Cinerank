import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            showToast('Signed in successfully!', 'success');
        } catch (error) {
            console.error("Error signing in with Google", error);
            showToast('Failed to sign in', 'error');
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            showToast('Signed out successfully', 'info');
        } catch (error) {
            console.error("Error signing out", error);
            showToast('Failed to sign out', 'error');
        }
    };

    return (
        <AuthContext.Provider value={{ user, signInWithGoogle, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
