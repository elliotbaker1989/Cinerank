import React from 'react';
import { Users } from 'lucide-react';

const FriendsScreen = () => {
    return (
        <div className="p-8 min-h-[80vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-800/30">
                <Users size={48} className="text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Friends</h2>
            <p className="text-slate-400 max-w-xs">
                Connect with friends to see their rankings and compare movie tastes.
            </p>
            <button className="mt-8 btn btn-primary">
                Invite Friends
            </button>
        </div>
    );
};

export default FriendsScreen;
