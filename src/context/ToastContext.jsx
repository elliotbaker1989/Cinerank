import React, { createContext, useState, useContext } from 'react';
import { Check, Info, Heart, AlertCircle, Trophy, ThumbsUp, ThumbsDown } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (arg1, arg2) => {
        let message, type, action, duration, icon;

        if (typeof arg1 === 'string') {
            message = arg1;
            type = arg2 || 'info';
            duration = 3000;
        } else {
            ({ message, type = 'info', action, duration = 5000, icon } = arg1);
        }

        const id = crypto.randomUUID();
        setToasts(prev => {
            const newToasts = [...prev, { id, message, type, action, duration, icon }];
            return newToasts.slice(-4); // Keep only the last 4
        });

        // Auto-dismiss after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    };

    const dismissToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

const Toast = ({ id, message, type, action, icon, onDismiss }) => {
    const getToastStyles = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <Check size={18} className="text-green-400" />,
                    border: 'border-green-500/30',
                    bg: 'bg-green-500/10'
                };
            case 'error':
                return {
                    icon: <AlertCircle size={18} className="text-red-400" />,
                    border: 'border-red-500/30',
                    bg: 'bg-red-500/10'
                };
            case 'love':
                return {
                    icon: (
                        <div className="flex items-center -space-x-2">
                            <ThumbsUp size={18} className="text-purple-500 transform -rotate-12" fill="currentColor" />
                            <ThumbsUp size={18} className="text-purple-500 transform rotate-6" fill="currentColor" />
                        </div>
                    ),
                    border: 'border-purple-500/30',
                    bg: 'bg-purple-500/10'
                };
            case 'like':
                return {
                    icon: <ThumbsUp size={18} className="text-green-400" fill="currentColor" />,
                    border: 'border-green-500/30',
                    bg: 'bg-green-500/10'
                };
            case 'dislike':
                return {
                    icon: <ThumbsDown size={18} className="text-red-400" fill="currentColor" />,
                    border: 'border-red-500/30',
                    bg: 'bg-red-500/10'
                };
            case 'rank':
                return {
                    icon: <Trophy size={18} className="text-yellow-500" fill="currentColor" />,
                    border: 'border-yellow-500/30',
                    bg: 'bg-yellow-500/10'
                };
            default:
                return {
                    icon: <Info size={18} className="text-sky-400" />,
                    border: 'border-sky-500/30',
                    bg: 'bg-sky-500/10'
                };
        }
    };

    const styles = getToastStyles();

    return (
        <div className={`pointer-events-auto glass-panel px-6 py-4 rounded-full flex items-center gap-4 min-w-[300px] animate-bounce-in border ${styles.border} ${styles.bg}`}>
            {icon || styles.icon}
            <p className="flex-1 text-white text-sm font-medium">{message}</p>
            {action && (
                <button
                    onClick={() => {
                        action.onClick();
                        onDismiss(id);
                    }}
                    className="text-sky-400 hover:text-sky-300 text-sm font-bold transition-colors uppercase tracking-wider"
                >
                    {action.label}
                </button>
            )}
            <button
                onClick={() => onDismiss(id)}
                className="text-slate-400 hover:text-white transition-colors"
            >
                ✕
            </button>
        </div>
    );
};
