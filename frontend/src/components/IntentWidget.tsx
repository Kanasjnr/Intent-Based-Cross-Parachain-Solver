import React, { useState } from 'react';
import { ArrowDown, ShieldCheck, Zap, Info, Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SimulationStatus } from '../types/simulation';

interface Props {
    onSign: () => void;
    onReset: () => void;
    onAmountChange: (val: string) => void;
    status: SimulationStatus;
}

export const IntentWidget: React.FC<Props> = ({ onSign, onReset, onAmountChange, status }) => {
    const [amount, setLocalAmount] = useState('100');

    const isDisabled = status !== 'idle';
    const isSuccess = status === 'success';

    const handleAmountChange = (val: string) => {
        setLocalAmount(val);
        onAmountChange(val);
    };

    return (
        <div className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-white">New Settlement Intent</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5 uppercase tracking-tighter">Moonbeam → AssetHub</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-teal-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    MEV GUARD ACTIVE
                </div>
            </div>

            <div className="p-6 space-y-3">
                {/* Source */}
                <div className={isDisabled ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
                    <div className="flex justify-between text-[10px] text-zinc-600 mb-2 px-0.5 font-mono uppercase">
                        <span>From · Moonbeam</span>
                        <span>Bal: 142.5</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-800 px-2.5 py-1.5 rounded-lg shrink-0 border border-white/5">
                            <div className="w-4 h-4 rounded-full bg-pink-600" />
                            <span className="text-xs font-bold text-white">DOT</span>
                        </div>
                        <input
                            type="number"
                            className="bg-transparent border-none focus:outline-none text-right w-full text-2xl font-mono text-white placeholder-zinc-900"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            disabled={isDisabled}
                        />
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center py-0.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-600 shadow-lg">
                        <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* Destination */}
                <div className={isDisabled ? 'opacity-50 transition-opacity' : ''}>
                    <div className="text-[10px] text-zinc-600 mb-2 px-0.5 font-mono uppercase">To · AssetHub</div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-800 px-2.5 py-1.5 rounded-lg shrink-0 border border-white/5">
                            <div className="w-4 h-4 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-white">USDT</span>
                        </div>
                        <div className="text-right w-full text-2xl font-mono text-zinc-500">
                            {amount ? (Number(amount) * 7.42).toFixed(2) : '0.00'}
                        </div>
                    </div>
                </div>

                {/* Summary Info */}
                <div className="pt-2 space-y-2.5 border-t border-white/5 mt-2">
                    {[
                        { label: 'Solver Node', value: 'node_Acura_1' },
                        { label: 'Network Bond', value: '14,200 $PBT', highlight: 'amber' },
                        { label: 'PVM Verifier', value: '0x8f87...cfaa', highlight: 'zinc' },
                    ].map(({ label, value, highlight }) => (
                        <div key={label} className="flex justify-between items-center text-[11px]">
                            <span className="text-zinc-600 font-mono uppercase tracking-tighter">{label}</span>
                            <span className={`font-mono font-bold ${highlight === 'amber' ? 'text-amber-500/80' :
                                    highlight === 'zinc' ? 'text-zinc-500' :
                                        'text-zinc-300'
                                }`}>{value}</span>
                        </div>
                    ))}
                </div>

                {/* CTA Button */}
                <div className="flex gap-2">
                    {isSuccess && (
                        <motion.button
                            onClick={onReset}
                            whileTap={{ scale: 0.95 }}
                            className="mt-4 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all flex items-center justify-center shadow-lg"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </motion.button>
                    )}
                    <motion.button
                        onClick={onSign}
                        disabled={isDisabled || !amount}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        className={`mt-4 w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : status === 'signing' || status === 'verifying'
                                    ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                                    : 'bg-teal-400 hover:bg-teal-300 text-black shadow-teal-500/10'
                            }`}
                    >
                        {status === 'idle' && (
                            <>
                                <Zap className="w-4 h-4 fill-black text-black" />
                                Sign & Lock Assets
                            </>
                        )}
                        {status === 'signing' && (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                                Signing...
                            </>
                        )}
                        {status === 'verifying' && (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                                Verifying...
                            </>
                        )}
                        {status === 'success' && (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Finalized
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Footer Meta */}
            <div className="px-6 py-3 border-t border-white/5 flex items-center gap-2 bg-black/10">
                <Info className="w-3 h-3 text-zinc-800" />
                <span className="text-[10px] font-mono text-zinc-700 tracking-widest uppercase">
                    Logic accepted by Mainnet-Shadow
                </span>
            </div>
        </div>
    );
};
