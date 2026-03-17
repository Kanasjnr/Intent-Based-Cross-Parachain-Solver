import React from 'react';
import { LayoutDashboard, ShieldCheck, History, Database, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { icon: LayoutDashboard, label: 'Console', active: true },
    { icon: ShieldCheck, label: 'MEV Guard', active: false },
    { icon: Database, label: 'Solver Bonds', active: false },
    { icon: History, label: 'Logs', active: false },
];

export const Sidebar: React.FC = () => {
    return (
        <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col hidden xl:flex shrink-0 h-[calc(100vh-56px)]">
            <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-2">Protocol</p>
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all group",
                            item.active
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent"
                        )}
                    >
                        <item.icon className={cn("w-4 h-4", item.active ? "text-primary" : "text-zinc-600 group-hover:text-zinc-400")} />
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="mt-auto p-4 border-t border-zinc-900">
                <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter text-zinc-400">PVM Status</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-600 uppercase">Latency</span>
                        <span className="text-primary font-bold">2.4ms</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-1">
                        <span className="text-zinc-600 uppercase">Logic</span>
                        <span className="text-zinc-300 uppercase truncate max-w-[80px]">intent-v1.0</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
