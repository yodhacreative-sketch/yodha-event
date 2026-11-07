import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-3xl mb-4 border border-amber-400/30">
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-2">Terjadi Sedikit Kendala Tampilan</h2>
          <p className="text-xs text-stone-400 mb-6 max-w-md font-mono bg-stone-900 p-3 rounded-xl border border-white/10 break-all">
            {this.state.error?.message || "Komponen mengalami kesalahan saat dimuat."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-400 text-stone-950 font-bold hover:bg-amber-300 transition-all cursor-pointer"
            >
              🔄 Muat Ulang Halaman
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              className="px-5 py-2.5 rounded-xl bg-stone-800 text-stone-300 font-semibold hover:bg-stone-700 transition-all cursor-pointer border border-white/10"
            >
              Reset Cache & Mulai Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
