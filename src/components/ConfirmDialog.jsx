import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger", // danger, warning, info
    requireInput = false,
    confirmKeyword = "delete"
}) => {
    const [inputValue, setInputValue] = useState("");

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            button: 'bg-red-500 hover:bg-red-400',
            icon: 'text-red-400',
            iconBg: 'bg-red-500/10'
        },
        warning: {
            button: 'bg-yellow-500 hover:bg-yellow-400',
            icon: 'text-yellow-400',
            iconBg: 'bg-yellow-500/10'
        },
        info: {
            button: 'bg-sky-500 hover:bg-sky-400',
            icon: 'text-sky-400',
            iconBg: 'bg-sky-500/10'
        }
    };

    const styles = variantStyles[variant] || variantStyles.danger;
    const isConfirmDisabled = requireInput && inputValue.toLowerCase() !== confirmKeyword.toLowerCase();

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${styles.iconBg}`}>
                            <AlertTriangle className={styles.icon} size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 pb-6">
                    <p className="text-slate-300 text-base leading-relaxed mb-4">{message}</p>

                    {requireInput && (
                        <div className="space-y-2">
                            <p className="text-sm text-slate-400">
                                Type <span className="font-bold text-white select-all">"{confirmKeyword}"</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={`Type "${confirmKeyword}"`}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                            setInputValue(""); // Reset input
                        }}
                        disabled={isConfirmDisabled}
                        className={`flex-1 py-3 ${styles.button} text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
