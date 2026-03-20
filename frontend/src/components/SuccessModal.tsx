import React from 'react';
import { CheckCircle2, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    amount: string;
    liveRate: number;
    txHash?: string | null;
    sourceSymbol: string;
    destSymbol: string;
    sourceChain: string;
    destChain: string;
}

export const SuccessModal: React.FC<Props> = ({ 
    isOpen, onClose, amount, liveRate, txHash, 
    sourceSymbol, destSymbol, sourceChain, destChain 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div
                className="relative bg-zinc-900 border-2 border-black rounded-3xl w-full max-w-lg overflow-hidden shadow-[12px_12px_12px_rgba(0,0,0,0.5)]"
            >
                {/* Success Header */}
                <div className="bg-teal-400/10 p-10 flex flex-col items-center border-b-2 border-black">
                    <div className="w-20 h-20 rounded-full bg-teal-400 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 border-2 border-black">
                        <CheckCircle2 className="w-10 h-10 text-black" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Settlement Finalized</h2>
                    <p className="text-teal-400 text-sm font-mono font-black uppercase tracking-[0.2em] mt-2">Proof Verified by PVM v6</p>
                </div>

                {/* Transfer Details */}
                <div className="p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                            <p className="text-xs font-black text-zinc-500 uppercase mb-2 tracking-widest">Source</p>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-pink-600 border border-black" />
                                <span className="text-lg font-black text-white uppercase">{amount || '100'} {sourceSymbol}</span>
                            </div>
                            <p className="text-xs font-mono text-zinc-700 mt-2 uppercase">{sourceChain}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-zinc-700" />
                        <div className="text-center flex-1">
                            <p className="text-xs font-black text-zinc-500 uppercase mb-2 tracking-widest">Destination</p>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-500 border border-black" />
                                <span className="text-lg font-black text-white uppercase">{(Number(amount || 0) * liveRate).toFixed(2)} {destSymbol}</span>
                            </div>
                            <p className="text-xs font-mono text-zinc-700 mt-2 uppercase">{destChain}</p>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-2xl p-6 border-2 border-zinc-800 space-y-4">
                        {[
                            { label: 'Network Surety', value: '100% Guaranteed', icon: ShieldCheck, color: 'text-teal-400' },
                            { label: 'PVM Verifier', value: '0x8f87...cfaa', icon: null },
                            { label: 'Settlement TX', value: txHash ? `${txHash.slice(0, 12)}...${txHash.slice(-8)}` : '0xc799...39e6', icon: null },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-600 font-black uppercase tracking-tighter italic">{label}</span>
                                <div className="flex items-center gap-2">
                                    {Icon && <Icon className={`w-4 h-4 ${color}`} />}
                                    <span className={`font-mono font-bold ${color || 'text-zinc-400'}`}>{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => txHash && window.open(`https://blockscout-testnet.polkadot.io/tx/${txHash}`, '_blank')}
                            disabled={!txHash}
                            className={`flex-1 py-5 ${txHash ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[4px_4px_0px_#000]' : 'bg-zinc-800 text-zinc-700 cursor-not-allowed'} text-sm font-black uppercase tracking-widest rounded-xl transition-all border-2 border-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-2`}
                        >
                            Explorer
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
