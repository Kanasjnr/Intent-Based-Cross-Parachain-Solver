import React, { useState, useEffect } from 'react';

export const EMAChart: React.FC = () => {
    const [emaBars, setEmaBars] = useState([40, 45, 42, 48, 52, 50, 55, 60, 58, 65, 62, 58, 60, 64, 70, 75, 72, 68, 70, 74]);
    const [price, setPrice] = useState(7.441);

    useEffect(() => {
        const interval = setInterval(() => {
            setEmaBars(prev => {
                const next = [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.5) * 5];
                return next.map(v => Math.max(20, Math.min(90, v)));
            });
            setPrice(p => p + (Math.random() - 0.5) * 0.01);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-white">HydraDX EMA Oracle</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">10-minute moving average</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-teal-400 bg-teal-400/5 border border-teal-400/10 px-2 py-1 rounded-lg uppercase tracking-wider">✓ Safe</span>
                </div>
            </div>

            {/* Price bar chart */}
            <div className="h-24 flex items-end gap-0.5 px-1">
                {emaBars.map((h, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all duration-700 ${i === emaBars.length - 1
                            ? 'bg-teal-400 animate-pulse'
                            : 'bg-zinc-800'
                            }`}
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-black/30 rounded-xl border border-white/5">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Reference</p>
                    <p className="text-lg font-mono font-bold text-white">${price.toFixed(3)}</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">DOT/USDT</p>
                </div>
                <div className="p-3.5 bg-black/30 rounded-xl border border-white/5">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Floor (90%)</p>
                    <p className="text-lg font-mono font-bold text-teal-400">${(price * 0.9).toFixed(3)}</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">Min execute</p>
                </div>
            </div>

            <div className="p-3 bg-teal-400/5 border border-teal-400/10 rounded-xl">
                <p className="text-[10px] text-teal-400/70 leading-relaxed">
                    Settlement will be rejected by the PVM verifier if execution price falls below the 90% EMA threshold — preventing MEV and price manipulation.
                </p>
            </div>
        </div>
    );
};
