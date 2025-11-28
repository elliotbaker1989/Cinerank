import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import getCroppedImg from '../utils/cropImage';
import { useAuth } from '../context/AuthContext';
import { useMovieContext } from '../context/MovieContext';
import { useToast } from '../context/ToastContext';
import { getWatchProviders, IMAGE_BASE_URL } from '../services/api';
import { GENRE_ID_MAP } from '../utils/constants';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
    User, Mail, Globe, Monitor, LogOut, Trash2,
    ChevronDown, Check, Shield, Camera, Edit2, Search, X, Upload
} from 'lucide-react';
import { getUserTitle } from '../utils/userTitles';

export const Settings = () => {
    const { user, logout, deleteAccount, selectedRegion, setSelectedRegion, selectedProviders, setSelectedProviders } = useAuth();
    const { ratings, lists, setActiveListId } = useMovieContext();
    const titleInfo = getUserTitle(Object.keys(ratings).length);
    const { showToast } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Local state for UI toggles and inputs
    const [isPublic, setIsPublic] = useState(true);
    const [displayName, setDisplayName] = useState(user?.displayName || 'Movie Buff');
    const [username, setUsername] = useState(user?.displayName?.toLowerCase().replace(/\s+/g, '') || 'moviebuff');
    // selectedRegion and selectedProviders are now from context
    const [availableProviders, setAvailableProviders] = useState([]);
    const [providerSearch, setProviderSearch] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Image Cropping State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Fetch providers on mount and when region changes
    useEffect(() => {
        const fetchProviders = async () => {
            const providers = await getWatchProviders(selectedRegion);

            // Deduplicate by provider_name
            const uniqueProviders = [];
            const seenNames = new Set();

            providers.forEach(p => {
                if (!seenNames.has(p.provider_name)) {
                    seenNames.add(p.provider_name);
                    uniqueProviders.push(p);
                }
            });

            setAvailableProviders(uniqueProviders.sort((a, b) => a.display_priority - b.display_priority));
        };
        fetchProviders();
    }, [selectedRegion]);

    const onFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            setIsCropping(true);
        }
    };

    const readFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result));
            reader.readAsDataURL(file);
        });
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSaveCroppedImage = async () => {
        try {
            setUploading(true);
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            // Upload to Firebase Storage
            const storageRef = ref(storage, `profile_images/${user.uid}/${Date.now()}.jpg`);
            await uploadBytes(storageRef, croppedImageBlob);
            const downloadURL = await getDownloadURL(storageRef);

            // Update User Profile
            await updateProfile(user, { photoURL: downloadURL });

            showToast("Profile picture updated!", "success");
            setIsCropping(false);
            setImageSrc(null);
        } catch (e) {
            console.error(e);
            showToast("Failed to update profile picture", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleGenreClick = (label) => {
        const genreId = GENRE_ID_MAP[label] || GENRE_ID_MAP[Object.keys(GENRE_ID_MAP).find(k => k.includes(label))];
        if (genreId) {
            setActiveListId(genreId);
            navigate('/ratings');
        }
    };

    // Mock stats calculation
    const totalRanked = Object.keys(ratings).length;
    const genreStats = [
        { label: 'Action', count: 12, color: 'bg-red-500' },
        { label: 'Sci-Fi', count: 8, color: 'bg-blue-500' },
        { label: 'Drama', count: 5, color: 'bg-purple-500' },
    ];
    const topGenre = genreStats[0];

    const regions = [
        { code: 'US', label: 'United States', flag: '🇺🇸' },
        { code: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
        { code: 'CA', label: 'Canada', flag: '🇨🇦' },
        { code: 'AU', label: 'Australia', flag: '🇦🇺' },
    ];

    const toggleProvider = (provider) => {
        const exists = selectedProviders.some(p => p.provider_id === provider.provider_id);

        if (exists) {
            showToast(`${provider.provider_name} removed from subscriptions list`, "error");
            setSelectedProviders(prev => prev.filter(p => p.provider_id !== provider.provider_id));
        } else {
            showToast(`${provider.provider_name} added to subscriptions list`, "success");
            setSelectedProviders(prev => [...prev, {
                provider_id: provider.provider_id,
                provider_name: provider.provider_name,
                logo_path: provider.logo_path || null
            }]);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount();
            navigate('/');
        } catch (error) {
            // Error handling is done in AuthContext
        }
    };

    const filteredProviders = availableProviders.filter(p =>
        p.provider_name.toLowerCase().includes(providerSearch.toLowerCase())
    );

    return (
        <main className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* ... (header and other sections remain same) ... */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Section */}
                <section className="glass-panel p-6 rounded-3xl space-y-6 h-fit">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="text-sky-400" size={20} /> Profile
                    </h2>

                    <div className="flex items-start gap-6">

                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {/* ... existing image code ... */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="relative">
                                <img
                                    src={user?.photoURL}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full border-4 border-white/10 group-hover:border-sky-500/50 transition-colors object-cover"
                                />
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${titleInfo.current.color}`}>
                                        {titleInfo.current.title}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            {/* Progress Bar */}
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Current Level</p>
                                        <p className={`text-sm font-bold ${titleInfo.current.color}`}>{titleInfo.current.title}</p>
                                    </div>
                                    {titleInfo.next && (
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 font-medium">Next Level</p>
                                            <p className={`text-sm font-bold ${titleInfo.next.color}`}>{titleInfo.next.title}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${titleInfo.current.bgColor} transition-all duration-500`}
                                        style={{ width: `${titleInfo.progress}%` }}
                                    />
                                </div>
                                {titleInfo.next ? (
                                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                                        <span className="text-white font-bold">{titleInfo.needed}</span> more ratings to level up
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-amber-500 mt-2 text-center font-bold">
                                        Max Level Achieved!
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Display Name</label>
                                {/* ... existing inputs ... */}
                                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10 focus-within:border-sky-500/50 transition-colors">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="bg-transparent text-white font-medium w-full outline-none"
                                    />
                                    <Edit2 size={14} className="text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Username</label>
                                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10 focus-within:border-sky-500/50 transition-colors">
                                    <span className="text-slate-500">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="bg-transparent text-white font-medium w-full outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-400 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <Mail size={14} />
                                        <span className="text-sm">{user?.email}</span>
                                    </div>

                                    {user?.providerData?.some(p => p.providerId === 'google.com') && (
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="bg-white p-1 rounded-full w-4 h-4 flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                                                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                                    </g>
                                                </svg>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Account</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-6 rounded-full relative transition-colors duration-300 cursor-pointer ${isPublic ? 'bg-sky-500' : 'bg-slate-700'}`} onClick={() => setIsPublic(!isPublic)}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isPublic ? 'left-5' : 'left-1'}`} />
                            </div>
                            <div>
                                <p className="text-white font-medium">Public Profile</p>
                                <p className="text-xs text-slate-400">Allow others to see your rankings</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="glass-panel p-6 rounded-3xl space-y-6 h-fit">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Monitor className="text-purple-400" size={20} /> Stats & Overview
                        </h2>
                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                            Top Genre: {topGenre.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div
                            onClick={() => navigate('/ratings')}
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group"
                        >
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-white transition-colors">Total Ranked</p>
                            <p className="text-3xl font-black text-white">{totalRanked}</p>
                        </div>
                        <div
                            onClick={() => navigate('/watchlist')}
                            className="bg-white/5 rounded-2xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group"
                        >
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-white transition-colors">Watchlist</p>
                            <p className="text-3xl font-black text-white">{lists.watchlist?.length || 0}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Genre Breakdown</p>
                        <div className="space-y-3">
                            {genreStats.map(stat => (
                                <div
                                    key={stat.label}
                                    onClick={() => handleGenreClick(stat.label)}
                                    className="cursor-pointer group"
                                >
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white font-medium group-hover:text-sky-400 transition-colors">{stat.label}</span>
                                        <span className="text-slate-400">{stat.count} movies</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${stat.color} rounded-full`}
                                            style={{ width: `${(stat.count / 25) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* Region & Streaming Section */}
            <section className="glass-panel p-6 rounded-3xl space-y-8">
                {/* ... (region selector remains same) ... */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Globe className="text-green-400" size={20} /> Region & Streaming
                    </h2>

                    <div className="relative w-full md:w-64">
                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="w-full bg-white/5 text-white font-medium rounded-xl px-4 py-2 border border-white/10 appearance-none outline-none focus:border-sky-500/50 transition-colors cursor-pointer pl-10"
                        >
                            {regions.map(region => (
                                <option key={region.code} value={region.code} className="bg-slate-900">
                                    {region.label}
                                </option>
                            ))}
                        </select>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">{regions.find(r => r.code === selectedRegion)?.flag}</span>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Selected Providers (Your Subscriptions) */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Your Current Subscriptions</label>
                        <p className="text-[10px] text-slate-400">
                            These services will be highlighted when you're looking for movies.
                        </p>
                    </div>

                    {selectedProviders.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {selectedProviders.map(provider => (
                                <button
                                    key={provider.provider_id}
                                    onClick={() => toggleProvider(provider)}
                                    className="relative aspect-square rounded-2xl bg-white/10 border border-white/20 shadow-lg shadow-sky-500/10 flex flex-col items-center justify-center gap-3 group hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300"
                                    title={`Remove ${provider.provider_name}`}
                                >
                                    {provider.logo_path ? (
                                        <img
                                            src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                                            alt={provider.provider_name}
                                            className="w-16 h-16 rounded-xl object-cover shadow-md group-hover:opacity-50 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-500">
                                            {provider.provider_name.slice(0, 2)}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="text-red-400" size={24} />
                                    </div>
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center shadow-sm group-hover:opacity-0 transition-opacity">
                                        <Check size={12} className="text-white" strokeWidth={3} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <p className="text-slate-400 text-sm">No subscriptions selected yet.</p>
                        </div>
                    )}
                </div>

                {/* Search and Add Providers */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Add Subscriptions</label>
                            <p className="text-[10px] text-slate-400">
                                Tap to add to your list.
                            </p>
                        </div>

                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={providerSearch}
                                onChange={(e) => setProviderSearch(e.target.value)}
                                className="w-full bg-white/5 text-white text-sm rounded-xl px-4 py-2 pl-10 border border-white/10 focus:border-sky-500/50 outline-none transition-colors"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {filteredProviders
                            .map(provider => {
                                const isSelected = selectedProviders.some(p => p.provider_id === provider.provider_id);
                                return (
                                    <button
                                        key={provider.provider_id}
                                        onClick={() => toggleProvider(provider)}
                                        className={`
                                            relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group border
                                            ${isSelected
                                                ? 'bg-sky-500/20 border-sky-500/50 shadow-[0_0_15px_-5px_rgba(14,165,233,0.3)]'
                                                : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20'
                                            }
                                        `}
                                        title={isSelected ? `Remove ${provider.provider_name}` : `Add ${provider.provider_name}`}
                                    >
                                        {provider.logo_path ? (
                                            <img
                                                src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                                                alt={provider.provider_name}
                                                className={`w-8 h-8 rounded-lg object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {provider.provider_name.slice(0, 2)}
                                            </div>
                                        )}
                                        <span className={`text-[8px] text-center line-clamp-1 w-full px-1 transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                                            {provider.provider_name}
                                        </span>

                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-3 h-3 bg-sky-500 rounded-full flex items-center justify-center shadow-sm">
                                                <Check size={8} className="text-white" strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                    </div>
                </div>
            </section>

            {/* Account Actions */}
            <section className="glass-panel p-6 rounded-3xl space-y-6 h-fit">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="text-red-400" size={20} /> Account Actions
                </h2>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={logout}
                        className="flex-1 flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
                    >
                        <span className="font-bold text-slate-300 group-hover:text-white transition-colors">Sign Out</span>
                        <LogOut size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex-1 flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 rounded-2xl border border-red-500/20 hover:border-red-500/30 transition-all group"
                    >
                        <span className="font-bold text-red-400 group-hover:text-red-300 transition-colors">Delete Account</span>
                        <Trash2 size={20} className="text-red-400 group-hover:text-red-300 transition-colors" />
                    </button>
                </div>
            </section>
        </main>
    );
};
