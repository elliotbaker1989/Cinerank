import React from 'react';
import { X, Check, Star, Film, Sparkles, Users } from 'lucide-react';

const SignInModal = ({ isOpen, onClose, onSignIn }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop with blur and darken */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-500"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">

                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none mix-blend-screen" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none mix-blend-screen" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10 z-50"
                >
                    <X size={20} />
                </button>

                <div className="relative z-10 p-8 md:p-10 flex flex-col items-center text-center">

                    {/* Header Section */}
                    <div className="mb-8 space-y-2">
                        <h2 className="text-display text-5xl font-black text-white tracking-tighter leading-none text-glow">
                            CineRank
                        </h2>
                        <p className="text-xl text-slate-300 font-light tracking-wide">
                            Curate Your Cinematic Universe
                        </p>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full mb-10">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
                            <Film className="text-sky-400" size={24} />
                            <span className="text-sm font-medium text-slate-200">Track Movies</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
                            <Sparkles className="text-purple-400" size={24} />
                            <span className="text-sm font-medium text-slate-200">AI Recommendations</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
                            <Star className="text-yellow-400" size={24} />
                            <span className="text-sm font-medium text-slate-200">Rate & Rank</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
                            <Users className="text-pink-400" size={24} />
                            <span className="text-sm font-medium text-slate-200">Connect with Friends</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full space-y-4">
                        <button
                            onClick={onSignIn}
                            className="group relative w-full py-4 px-6 bg-gradient-to-r from-sky-500 via-blue-500 to-purple-600 hover:from-sky-400 hover:via-blue-400 hover:to-purple-500 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative flex items-center justify-center gap-2">
                                Create Free Account
                            </span>
                        </button>

                        <button
                            onClick={onSignIn}
                            className="w-full py-3.5 px-6 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-medium transition-all duration-300 rounded-xl flex items-center justify-center gap-2"
                        >
                            Already have an account? <span className="text-white underline decoration-sky-500/50 underline-offset-4">Sign In</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="mt-8 text-xs text-slate-500 max-w-xs mx-auto">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignInModal;
