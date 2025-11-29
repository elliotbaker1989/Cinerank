import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.isAdmin) {
                return (
                    <div className="p-8 bg-red-900/90 text-white rounded-xl border border-red-500 backdrop-blur-xl m-4 shadow-2xl z-[9999] relative">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span>⚠️</span> Application Error (Admin View)
                        </h2>
                        <div className="mb-4 text-red-200 text-sm">
                            This error is only visible to you because you are a Super Admin.
                        </div>
                        <details className="whitespace-pre-wrap font-mono text-xs bg-black/50 p-4 rounded-lg overflow-auto max-h-[60vh]">
                            <summary className="cursor-pointer hover:text-red-300 transition-colors mb-2 font-bold">View Stack Trace</summary>
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-white text-red-900 font-bold rounded-lg hover:bg-red-50 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                );
            }

            // User facing error UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
                    <p className="text-slate-400 mb-6">We encountered an unexpected error. Please try reloading the page.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
