import React, { useState, useEffect } from 'react';
import { Droplets, Zap, Loader2, ExternalLink } from 'lucide-react';
import { FAUCET_ASSETS, EXPLORER_URL } from '../constants/faucet';
import { useFaucet } from '../hooks/useFaucet';

interface Props {
    account: string | null;
}

export const Faucet: React.FC<Props> = ({ account }) => {
    const [recipientAddress, setRecipientAddress] = useState<string>(account || '');
    const { mint, loading } = useFaucet();

    useEffect(() => {
        if (account && !recipientAddress) {
            setRecipientAddress(account);
        }
    }, [account, recipientAddress]);

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            <div className="brutalist-card p-10 bg-zinc-900 shadow-2xl border-2 border-black">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[4px_4px_0px_#000]">
                            <Droplets className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Token Faucet</h2>
                            <p className="text-zinc-500 text-base font-mono">Get testnet liquidity for your cross-chain intents</p>
                        </div>
                    </div>

                    <div className="flex-1 max-w-md">
                        <div className="brutalist-card bg-black p-4 border-2 border-zinc-800">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block italic">Recipient Address</label>
                           <input 
                             type="text" 
                             value={recipientAddress}
                             onChange={(e) => setRecipientAddress(e.target.value)}
                             placeholder="0x..."
                             className="w-full bg-transparent border-none focus:outline-none text-sm font-mono text-cyan-400 placeholder-zinc-800"
                           />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {FAUCET_ASSETS.map((asset) => (
                        <div key={asset.symbol} className="brutalist-card bg-zinc-800/50 p-8 flex flex-col justify-between hover:bg-zinc-800 transition-all border-2 border-zinc-800 shadow-[6px_6px_0px_#000]">
                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded shadow-lg mb-4 flex items-center justify-center text-white font-bold text-xl ${asset.color}`}>
                                    {asset.symbol[0]}
                                </div>
                                <h3 className="font-black text-white text-xl uppercase tracking-wider">{asset.symbol}</h3>
                                <p className="text-xs text-zinc-500 font-mono mt-2 uppercase tracking-widest">{asset.name}</p>
                            </div>

                            <button
                                onClick={() => mint(asset, recipientAddress)}
                                disabled={!!loading}
                                className={`w-full py-4 rounded font-black uppercase text-sm tracking-widest transition-all ${
                                    loading === asset.symbol 
                                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                                }`}
                            >
                                {loading === asset.symbol ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Minting...
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-3">
                                        <Zap className="w-4 h-4" />
                                        Mint 1000
                                    </div>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="brutalist-card p-8 bg-zinc-900 border-l-8 border-l-amber-500 shadow-xl">
                    <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-4 italic">Notice</h4>
                    <p className="text-base text-zinc-400 leading-relaxed font-medium">
                        These are mock tokens for use on the **Polkadot Hub Testnet**. They have no real-world value and are used to demonstrate Zenith's intent-based bridging.
                    </p>
                </div>
                <div className="brutalist-card p-8 bg-zinc-900 border-l-8 border-l-cyan-500 shadow-xl">
                    <h4 className="text-sm font-black text-cyan-500 uppercase tracking-widest mb-4 italic">Resources</h4>
                    <div className="space-y-4">
                        <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-zinc-400 hover:text-cyan-400 transition-colors font-bold uppercase tracking-wider">
                            <ExternalLink className="w-4 h-4" /> Testnet Explorer
                        </a>
                        <a href="#" className="flex items-center gap-3 text-sm text-zinc-400 hover:text-cyan-400 transition-colors font-bold uppercase tracking-wider">
                            <ExternalLink className="w-4 h-4" /> Governance Dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
