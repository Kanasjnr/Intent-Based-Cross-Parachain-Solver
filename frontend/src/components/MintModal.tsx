import React, { useState, useEffect } from 'react';
import { X, Droplets, ExternalLink, ShieldCheck } from 'lucide-react';
import { FAUCET_ASSETS, EXPLORER_URL } from '../constants/faucet';
import { useFaucet } from '../hooks/useFaucet';
import { Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    account: string | null;
}

export const MintModal: React.FC<Props> = ({ isOpen, onClose, account }) => {
    const [recipientAddress, setRecipientAddress] = useState<string>(account || '');
    const { mint, loading } = useFaucet();

    useEffect(() => {
        if (account && !recipientAddress) {
            setRecipientAddress(account);
        }
    }, [account, recipientAddress]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal */}
            <div className="relative w-full max-w-xl brutalist-card bg-zinc-900 border-2 border-black overflow-hidden shadow-[20px_20px_0px_#000]">
                {/* Header */}
                <div className="px-8 py-6 bg-black border-b-2 border-black flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-violet-500 border-2 border-black flex items-center justify-center rotate-3 shadow-[3px_3px_0px_#000]">
                            <Droplets className="w-6 h-6 text-white fill-current" />
                        </div>
                        <h2 className="text-lg font-black text-white uppercase tracking-widest italic">Mock Asset Faucet</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Recipient Input */}
                    <div className="brutalist-card bg-black p-6 border-2 border-zinc-800 shadow-[4px_4px_0px_#000]">
                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 block italic">Recipient Address</label>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                               <ShieldCheck className="w-5 h-5" />
                           </div>
                           <input 
                             type="text" 
                             value={recipientAddress}
                             onChange={(e) => setRecipientAddress(e.target.value)}
                             placeholder="0x..."
                             className="w-full bg-transparent border-none focus:outline-none text-lg font-mono text-cyan-400 placeholder-zinc-800"
                           />
                        </div>
                    </div>

                    {/* Asset Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {FAUCET_ASSETS.map((asset) => (
                            <button
                                key={asset.symbol}
                                onClick={() => mint(asset, recipientAddress)}
                                disabled={!!loading}
                                className="brutalist-card bg-zinc-800/50 p-6 flex flex-col items-center gap-4 hover:bg-zinc-800 transition-all border-2 border-zinc-800 hover:border-cyan-400 group relative shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                            >
                                <div className={`w-12 h-12 rounded flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform ${asset.color}`}>
                                    {asset.symbol[0]}
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-black text-white uppercase">{asset.symbol}</div>
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">{asset.name}</div>
                                </div>
                                <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-2">
                                    <div className={`h-full bg-cyan-400 transition-all duration-300 ${loading === asset.symbol ? 'w-full animate-pulse' : 'w-0'}`} />
                                </div>
                                {loading === asset.symbol && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="text-[10px] font-mono text-zinc-400 text-center leading-relaxed">
                        Notice: Assets are for Polkadot Hub Testnet (v2) intents. <br/>
                        Mock tokens have no real value. High-volume minting is rate-limited.
                    </div>
                </div>

                <div className="px-8 py-4 bg-zinc-950 flex items-center justify-between border-t border-black">
                     <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase hover:text-cyan-400 transition-colors">
                        <ExternalLink className="w-3 h-3" /> Explorer
                     </a>
                     <div className="text-[10px] font-black text-zinc-500 tracking-tighter">ZENITH_PVM_FAUCET_v2.0</div>
                </div>
            </div>
        </div>
    );
};
