import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { getUserTitle } from '../../utils/userTitles';
import SEO from '../../components/SEO';

const AdminMembers = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const navigate = useNavigate();

    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const q = query(collection(db, 'users'));
                const querySnapshot = await getDocs(q);
                const fetchedMembers = [];

                // We also need to fetch their ratings count to determine rank
                // This is expensive if we do it for everyone. 
                // Ideally, we should store 'ratingsCount' on the user doc.
                // For now, we'll just fetch the user docs. 
                // If ratings are in a subcollection, we can't easily count them all here without N+1 reads.
                // Let's assume for now we just show the user data we have.
                // If we really need Rank, we might need to aggregate it.
                // Wait, getUserTitle takes a count.
                // Let's try to fetch all ratings? No, too many.
                // We'll skip the dynamic rank calculation for now or just show "Member" if we don't have the count.
                // Actually, let's check if we can get the count easily. 
                // If not, we'll just display the user data.

                querySnapshot.forEach((doc) => {
                    fetchedMembers.push({ id: doc.id, ...doc.data() });
                });
                setMembers(fetchedMembers);
            } catch (error) {
                console.error("Error fetching members:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, []);

    // Filter members
    const filteredMembers = members.filter(member =>
        member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <div className="text-white text-center mt-20">Loading members...</div>;
    }

    if (error) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                <h3 className="text-xl font-bold text-red-400 mb-2">Error Loading Members</h3>
                <p className="text-slate-300">{error}</p>
                <p className="text-slate-400 text-sm mt-4">
                    This is likely due to Firestore Security Rules.
                    Ensure your rules allow reading the 'users' collection.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SEO title="Members - CineRank Admin" />
            {/* Header Stats */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Members</h2>
                    <p className="text-slate-400 mt-1">Total Registered Users: <span className="text-sky-400 font-bold">{members.length}</span></p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 focus:bg-slate-800 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[40%]">User</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Sign In</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currentMembers.map((member) => {
                                const ratingsCount = member.ratings ? Object.keys(member.ratings).length : 0;
                                const listsCount = (member.lists?.['all-time']?.length || 0) + (member.lists?.watchlist?.length || 0);
                                const totalContributions = ratingsCount + listsCount;
                                const titleInfo = getUserTitle(totalContributions);

                                return (
                                    <tr
                                        key={member.id}
                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/cineadmin/members/${member.id}`)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'User')}&background=random`}
                                                    alt={member.displayName}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-white/10 group-hover:border-sky-500/50 transition-colors"
                                                />
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-white text-lg leading-none group-hover:text-sky-400 transition-colors">{member.displayName || 'Unknown User'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 ${titleInfo.current.color}`}>
                                                            {titleInfo.current.title}
                                                        </span>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 shrink-0">
                                                            <Activity className="text-sky-500" size={14} />
                                                            <span className="text-sm font-black text-white">
                                                                {(member.ratings ? Object.keys(member.ratings).length : 0) +
                                                                    (member.lists?.['all-time']?.length || 0) +
                                                                    (member.lists?.watchlist?.length || 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-300 text-sm">{member.email}</td>
                                        <td className="p-4 text-slate-400 text-sm">{formatDate(member.dateJoined)}</td>
                                        <td className="p-4 text-slate-400 text-sm">{formatDate(member.lastSignIn)}</td>
                                    </tr>
                                );
                            })}
                            {currentMembers.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500">
                                        No members found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-white/10 flex justify-between items-center">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-slate-400">
                            Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMembers;
