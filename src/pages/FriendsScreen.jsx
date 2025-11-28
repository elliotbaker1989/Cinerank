import React from 'react';
import { Users } from 'lucide-react';

const FriendsScreen = () => {
    return (
        <div className="animate-in fade-in zoom-in duration-500">
            <h1 className="text-3xl font-bold text-white mb-8 pl-2 border-l-4 border-sky-500">Friends</h1>
            <div className="p-8 min-h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-800/30">
                    <Users size={48} className="text-slate-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect with Friends</h2>
                <p className="text-slate-400 max-w-xs">
                    Connect with friends to see their rankings and compare movie tastes.
                </p>
                <button className="mt-8 btn btn-primary">
                    Invite Friends
                </button>
            </div>
        </div>
    );
};

export default FriendsScreen;
