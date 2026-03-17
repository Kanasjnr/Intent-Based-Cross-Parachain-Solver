import React from 'react';
import { Shield, Wallet, Bell } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                    IntentDOT
                </span>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-slate-100 transition-colors">
                    <Bell className="w-5 h-5" />
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:border-primary/50 transition-all text-sm font-medium text-slate-200">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span>Connect Wallet</span>
                </button>
            </div>
        </header>
    );
};
