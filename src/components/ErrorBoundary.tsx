import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full bg-zinc-800 border border-zinc-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Terjadi Kendala pada Tampilan
              </h1>
              <p className="text-sm text-zinc-400">
                Sistem mendeteksi galat perenderan antarmuka. Anda dapat memuat ulang aplikasi atau menyetel ulang penyimpanan lokal.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-700/60 font-mono text-xs text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/30"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang (Reload)
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full py-3 px-4 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Reset Cache & Muat
              </button>
            </div>

            <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-700/50">
              SIMPRESENSI GTK Madrasah • Sistem Pemulihan Otomatis
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
