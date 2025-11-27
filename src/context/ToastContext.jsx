import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, Info, AlertCircle, Heart } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const ToastItem = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleAnimationEnd = () => {
        if (isExiting) {
            onRemove(toast.id);
        }
    };

    const handleClose = () => {
        setIsExiting(true);
    };

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-white/10
                ${isExiting ? 'animate-bounce-out' : 'animate-bounce-in'}
                ${toast.type === 'success' ? 'bg-green-500/20 text-green-200' : ''}
                ${toast.type === 'love' ? 'bg-purple-500/20 text-purple-200' : ''}
                ${toast.type === 'info' ? 'bg-sky-500/20 text-sky-200' : ''}
                ${toast.type === 'error' ? 'bg-red-500/20 text-red-200' : ''}
            `}
            onAnimationEnd={handleAnimationEnd}
        >
            {toast.type === 'success' && <CheckCircle size={18} className="text-green-400" />}
            {toast.type === 'love' && <Heart size={18} className="text-purple-400 fill-purple-400/20" />}
            {toast.type === 'info' && <Info size={18} className="text-sky-400" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-red-400" />}

            <span className="font-medium text-sm">{toast.message}</span>

            <button
                onClick={handleClose}
                className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
