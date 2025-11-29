import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminMenu from '../../components/admin/AdminMenu';
import AdminMembers from './AdminMembers';
import AdminMemberDetails from './AdminMemberDetails';
import AdminContributions from './AdminContributions';
import AdminSettings from './AdminSettings';
import SEO from '../../components/SEO';

const CineAdmin = () => {
    const { user, loading } = useAuth();
    const ADMIN_EMAIL = 'elbak89@gmail.com';

    if (loading) return null;

    // Protect the route
    if (!user || user.email !== ADMIN_EMAIL) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen">
            <SEO title="CineRank Admin" />
            {/* Admin Menu replaces the standard FloatingMenu */}
            <AdminMenu />

            <div className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-12">
                <Routes>
                    <Route path="/" element={<AdminMembers />} />
                    <Route path="/members/:id" element={<AdminMemberDetails />} />
                    <Route path="/contributions" element={<AdminContributions />} />
                    <Route path="/settings" element={<AdminSettings />} />
                </Routes>
            </div>
        </div>
    );
};

export default CineAdmin;
