import React from 'react';
import { Activity, Shield, Coins, Users } from 'lucide-react';

const stats = [
    { label: 'Network Surety', value: '99.9%', icon: Shield, color: 'text-primary' },
    { label: 'Total Volume', value: '$25.4M', icon: Activity, color: 'text-blue-400' },
    { label: 'Solver Bonds', value: '840k PBT', icon: Coins, color: 'text-amber-400' },
    { label: 'Active Solvers', value: '18', icon: Users, color: 'text-purple-400' },
];

export const StatsOverview: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <div key={stat.label} className="glass-panel p-4 flex items-center justify-between group hover:border-slate-700 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-slate-100">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:bg-slate-800 transition-colors`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                </div>
            ))}
        </div>
    );
};
