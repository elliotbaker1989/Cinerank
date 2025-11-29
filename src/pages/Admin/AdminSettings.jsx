import React, { useState } from 'react';
import { Database, Layout, Users, Settings as SettingsIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import SEO from '../../components/SEO';

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('datasource');
    const { likesSource, setLikesSource } = useSettings();

    const tabs = [
        { id: 'datasource', label: 'Data Source', icon: Database },
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'layout', label: 'Layout', icon: Layout },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <SEO title="Settings - CineRank Admin" />
            <h1 className="text-3xl font-black text-white mb-8">Admin Settings</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 shrink-0 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-3xl p-8">
                    {activeTab === 'datasource' && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Data Source</h2>
                                <p className="text-slate-400">Manage where your application pulls data from.</p>
                            </div>

                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-white">Movie Likes</h3>
                                        <p className="text-sm text-slate-400">
                                            Current Source: <span className="text-sky-400 font-bold">{likesSource}</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setLikesSource(prev => prev === 'TMDB' ? 'Cinerank' : 'TMDB')}
                                        className={`flex items-center gap-3 px-4 py-2 rounded-full font-bold transition-all ${likesSource === 'TMDB'
                                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/50'
                                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/50'
                                            }`}
                                    >
                                        {likesSource === 'TMDB' ? (
                                            <>
                                                <ToggleRight size={24} />
                                                Use TMDB
                                            </>
                                        ) : (
                                            <>
                                                <ToggleLeft size={24} />
                                                Use Cinerank
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="mt-4 p-4 bg-black/20 rounded-xl text-sm text-slate-400">
                                    <p>
                                        <strong>ON (TMDB):</strong> Movie likes are pulled from TMDB (Vote Count).
                                        <br />
                                        <strong>OFF (Cinerank):</strong> Movie likes are pulled from Cinerank's own data.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'datasource' && (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <span className="text-3xl">🚧</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">Coming Soon</h3>
                            <p className="text-slate-400">This settings panel is under construction.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
