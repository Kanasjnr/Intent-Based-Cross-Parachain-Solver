import React from 'react';
import { Shield, Zap } from 'lucide-react';

export const Navbar: React.FC = () => (
    <nav className="border-b border-white/5 px-6 lg:px-10 h-14 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-[#0a0a0f]/80">
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">IntentDOT</span>
            <span className="hidden sm:block text-[10px] font-mono text-zinc-600 px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800">v1.0</span>
        </div>

        <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse inline-block" />
                <span className="text-[10px] font-mono text-zinc-500">Hub: live</span>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-400 hover:bg-teal-500/15 transition-colors">
                <Zap className="w-3.5 h-3.5" />
                Connect
            </button>
        </div>
    </nav>
);
