import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState('US'); // Default region
    const [selectedProviders, setSelectedProviders] = useState(null); // Initialize as null to indicate "not loaded"
    const { showToast } = useToast();

    useEffect(() => {
        console.log("Auth: Effect mounted");
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("Auth: State changed", currentUser?.uid);
            setUser(currentUser);

            if (currentUser) {
                // Fetch user data including selectedProviders
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    // Save/Update user profile data
                    const userData = {
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        lastSignIn: new Date().toISOString(),
                        dateJoined: currentUser.metadata.creationTime
                    };

                    await setDoc(userDocRef, userData, { merge: true });

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        console.log("Auth: Fetched data", data);
                        if (data.selectedProviders) {
                            console.log("Auth: Setting providers from DB", data.selectedProviders);
                            setSelectedProviders(data.selectedProviders);
                        } else {
                            console.log("Auth: No providers in DB, setting []");
                            setSelectedProviders([]); // No providers saved yet
                        }
                    } else {
                        console.log("Auth: No user doc, setting []");
                        setSelectedProviders([]); // New user doc
                    }
                } catch (error) {
                    console.error("Auth: Error fetching/saving user data:", error);
                    setSelectedProviders([]); // Fallback
                }
            } else {
                console.log("Auth: No user, setting []");
                setSelectedProviders([]);
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Save selectedProviders to Firestore whenever they change
    useEffect(() => {
        // Don't save if user is not logged in OR if providers haven't loaded yet (null)
        if (!user || selectedProviders === null) {
            console.log("Auth: Save skipped", { user: !!user, providers: selectedProviders });
            return;
        }

        const saveProviders = async () => {
            try {
                console.log("Auth: Saving providers to DB", selectedProviders);
                const sanitizedProviders = selectedProviders.map(p => ({
                    provider_id: p.provider_id,
                    provider_name: p.provider_name,
                    logo_path: p.logo_path || null
                }));
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, { selectedProviders: sanitizedProviders }, { merge: true });
                console.log("Auth: Save complete");
            } catch (error) {
                console.error("Auth: Error saving providers:", error);
            }
        };

        // Save immediately (or with very short debounce) to ensure persistence
        const timeoutId = setTimeout(saveProviders, 500);
        return () => clearTimeout(timeoutId);
    }, [selectedProviders, user]);

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

    const deleteAccount = async () => {
        try {
            if (user) {
                await deleteUser(user);
                showToast('Account deleted successfully', 'info');
            }
        } catch (error) {
            console.error("Error deleting account", error);
            if (error.code === 'auth/requires-recent-login') {
                showToast('Please sign in again to delete your account', 'error');
            } else {
                showToast('Failed to delete account', 'error');
            }
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            signInWithGoogle,
            logout,
            deleteAccount,
            loading,
            selectedRegion,
            setSelectedRegion,
            selectedProviders,
            setSelectedProviders
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
