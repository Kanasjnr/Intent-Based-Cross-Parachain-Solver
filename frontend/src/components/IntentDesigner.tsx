import React, { useState } from 'react';
import { ArrowDown, Info, ShieldCheck, Zap } from 'lucide-react';

export const IntentDesigner: React.FC = () => {
    const [amount, setAmount] = useState<string>('');

    return (
        <div className="max-w-xl mx-auto py-12 px-4">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Create Settlement Intent</h1>
                    <p className="text-slate-400 text-sm">Define your asset swap. Our solver network and PVM Verifier will handle the cross-chain complexity with MEV protection.</p>
                </div>

                <div className="glass-panel p-6 space-y-4">
                    {/* Source Asset */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                            <span>Pay from Moonbeam</span>
                            <span>Balance: 142.5 DOT</span>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-border focus-within:border-primary/50 transition-all">
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-6 h-6 rounded-full bg-polkadot flex items-center justify-center text-[10px] font-bold text-white">P</div>
                                <span className="font-semibold text-slate-100">DOT</span>
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="bg-transparent border-none focus:ring-0 text-right w-full text-xl font-mono text-white placeholder-slate-700"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary shadow-lg">
                            <ArrowDown className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Destination Asset */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                            <span>Receive on AssetHub</span>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-border focus-within:border-primary/50 transition-all">
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">$</div>
                                <span className="font-semibold text-slate-100">USDT</span>
                            </div>
                            <div className="text-right w-full text-xl font-mono text-slate-400">
                                {amount ? (parseFloat(amount) * 7.42).toFixed(2) : '0.00'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MEV Guard Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4">
                    <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-primary flex items-center gap-2">
                            HydraDX EMA Price Guard Active
                            <Info className="w-3.5 h-3.5 text-primary/60" />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Your intent is protected by the PVM Verifier. Settlement will be automatically rejected if the executed price is below <span className="text-primary font-medium">90%</span> of the 10-minute Exponential Moving Average.
                        </p>
                    </div>
                </div>

                <button className="w-full py-4 bg-primary hover:bg-primary-hover text-background font-bold rounded-xl shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 group">
                    <Zap className="w-5 h-5 fill-background" />
                    Sign & Lock Assets
                </button>

                <div className="text-center">
                    <span className="text-xs text-slate-500 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3 h-3" />
                        Secured by PolkaVM RISC-V Verifier
                    </span>
                </div>
            </div>
        </div>
    );
};
