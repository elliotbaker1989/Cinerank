import React, { useState, useEffect, useRef } from 'react';
import { Tv, Plus, Loader2 } from 'lucide-react';
import { getWatchProviders, IMAGE_BASE_URL } from '../services/api';

export const SubscriptionFilter = ({
    active,
    onToggle,
    selectedProviders = [],
    activeProviderFilters = [],
    onProviderFilterChange,
    tempProviders = [],
    onTempProviderAdd,
    region = 'US',
    compact = false,
    children
}) => {
    const [showProviderSearch, setShowProviderSearch] = useState(false);
    const [allProviders, setAllProviders] = useState([]);
    const [providerSearchQuery, setProviderSearchQuery] = useState('');
    const searchPopupRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchPopupRef.current && !searchPopupRef.current.contains(event.target)) {
                setShowProviderSearch(false);
            }
        };

        if (showProviderSearch) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProviderSearch]);

    useEffect(() => {
        if (showProviderSearch && allProviders.length === 0) {
            const fetchAllProviders = async () => {
                try {
                    const providers = await getWatchProviders(region);
                    setAllProviders(providers.sort((a, b) => a.display_priority - b.display_priority));
                } catch (error) {
                    console.error("Error fetching all providers:", error);
                }
            };
            fetchAllProviders();
        }
    }, [showProviderSearch, region, allProviders.length]);

    const handleAddTemp = (provider) => {
        onTempProviderAdd(provider);
        setShowProviderSearch(false);
        setProviderSearchQuery('');
    };

    return (
        <div className={`flex flex-col ${compact ? 'items-start' : 'items-center'} gap-4`}>
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggle}
                    className={`
                        ${compact ? 'px-3 py-1.5 text-xs' : 'px-6 py-3 text-base'}
                        rounded-full font-bold flex items-center gap-2 transition-all border
                        ${active
                            ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_-5px_rgba(74,222,128,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                        }
                    `}
                >
                    <Tv size={compact ? 14 : 18} />
                    On My Subscriptions
                </button>
                {children}
            </div>

            {active && (
                <div className={`flex flex-wrap ${compact ? 'justify-start' : 'justify-center'} gap-3 animate-fade-in items-start`}>
                    {[...selectedProviders, ...tempProviders].map(provider => {
                        const isActive = activeProviderFilters.includes(provider.provider_id);
                        return (
                            <button
                                key={provider.provider_id}
                                onClick={() => onProviderFilterChange(provider.provider_id)}
                                className={`relative group flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'scale-110 z-10' : 'hover:scale-105 opacity-50 hover:opacity-80'}`}
                                title={provider.provider_name}
                            >
                                <img
                                    src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    className={`
                                        ${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'}
                                        border-2 shadow-md transition-colors
                                        ${isActive
                                            ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                            : 'border-white/10 group-hover:border-white/30 grayscale'
                                        }
                                    `}
                                />
                                {isActive && (
                                    <div className="absolute top-full -mt-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]" />
                                )}
                            </button>
                        );
                    })}

                    {/* Add Temporary Provider Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProviderSearch(!showProviderSearch)}
                            className={`
                                ${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'}
                                border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/50 hover:bg-white/5 transition-all text-slate-400 hover:text-white
                            `}
                            title="Add temporary subscription"
                        >
                            <Plus size={compact ? 16 : 20} />
                        </button>

                        {/* Search Popover */}
                        {showProviderSearch && (
                            <div ref={searchPopupRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in">
                                <input
                                    type="text"
                                    placeholder="Search services..."
                                    value={providerSearchQuery}
                                    onChange={(e) => setProviderSearchQuery(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 mb-3"
                                    autoFocus
                                />
                                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                    {allProviders
                                        .filter(p =>
                                            p.provider_name.toLowerCase().includes(providerSearchQuery.toLowerCase()) &&
                                            !selectedProviders?.some(sp => sp.provider_id === p.provider_id) &&
                                            !tempProviders.some(tp => tp.provider_id === p.provider_id)
                                        )
                                        .map(provider => (
                                            <button
                                                key={provider.provider_id}
                                                onClick={() => handleAddTemp(provider)}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-left group"
                                            >
                                                <img
                                                    src={`${IMAGE_BASE_URL}${provider.logo_path}`}
                                                    alt={provider.provider_name}
                                                    className="w-8 h-8 rounded-lg"
                                                />
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate">
                                                    {provider.provider_name}
                                                </span>
                                            </button>
                                        ))}
                                    {allProviders.length === 0 && (
                                        <div className="text-center py-4 text-slate-500 text-xs">
                                            Loading providers...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
