import React from 'react';
import { CheckCircle2, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    amount: string;
}

export const SuccessModal: React.FC<Props> = ({ isOpen, onClose, amount }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-teal-500/10"
            >
                {/* Success Header */}
                <div className="bg-teal-400/10 p-8 flex flex-col items-center border-b border-white/5">
                    <div className="w-16 h-16 rounded-full bg-teal-400 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
                        <CheckCircle2 className="w-8 h-8 text-black" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Settlement Finalized</h2>
                    <p className="text-teal-400 text-xs font-mono font-bold uppercase tracking-widest mt-1">Proof Verified by PVM</p>
                </div>

                {/* Transfer Details */}
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Source</p>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-pink-600" />
                                <span className="text-sm font-bold text-white">{amount || '100'} DOT</span>
                            </div>
                            <p className="text-[10px] font-mono text-zinc-700 mt-0.5">Moonbeam</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-700" />
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Destination</p>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                <span className="text-sm font-bold text-white">{(Number(amount || 100) * 7.42).toFixed(2)} USDT</span>
                            </div>
                            <p className="text-[10px] font-mono text-zinc-700 mt-0.5">AssetHub</p>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                        {[
                            { label: 'Network Surety', value: '100% Guaranteed', icon: ShieldCheck, color: 'text-teal-400' },
                            { label: 'PVM Verifier', value: '0x8f87...cfaa', icon: null },
                            { label: 'Settlement TX', value: '0xc799...39e6', icon: null },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-600 font-mono uppercase tracking-tighter">{label}</span>
                                <div className="flex items-center gap-1.5">
                                    {Icon && <Icon className={`w-3 h-3 ${color}`} />}
                                    <span className={`font-mono font-bold ${color || 'text-zinc-300'}`}>{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors"
                        >
                            Close
                        </button>
                        <button className="flex-1 py-3.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                            Explorer
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
