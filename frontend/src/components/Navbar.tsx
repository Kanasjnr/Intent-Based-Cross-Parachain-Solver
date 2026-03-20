import React, { useState } from 'react';
import { Zap, RefreshCw, Droplets } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

interface Props {
    account: string | null;
    currentModule: 'bridge' | 'faucet';
    onModuleChange: (module: 'bridge' | 'faucet') => void;
    onOpenMint: () => void;
}

export const Navbar: React.FC<Props> = ({ account, currentModule, onModuleChange, onOpenMint }) => {
    const { open } = useAppKit();
    const [isConnecting, setIsConnecting] = useState(false);

    React.useEffect(() => {
        console.log("Navbar account prop updated:", account);
    }, [account]);

    const handleReset = () => {
        const keysToClear = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
        keysToClear.forEach(key => {
            if (key.includes('wc@') || key.includes('@w3m') || key.includes('appkit')) {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            }
        });

        // Final nuclear option: clear indexedDB for AppKit
        if (window.indexedDB) {
            window.indexedDB.deleteDatabase('WALLET_CONNECT_V2_SDK');
        }

        window.location.reload();
    };

    const handleOpen = async () => {
        if (isConnecting) return;
        setIsConnecting(true);
        try {
            await open();
        } finally {
            // Re-enable after a short delay to prevent spamming
            setTimeout(() => setIsConnecting(false), 2000);
        }
    };

    return (
        <nav className="border-b-2 border-black px-6 lg:px-10 h-16 flex items-center justify-between sticky top-0 z-50 bg-[#0c0c0e]">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => onModuleChange('bridge')}>
                    {/* Brand Logo - High Resolution PNG */}
                    <div className="w-12 h-12 flex items-center justify-center p-1 bg-white/5 rounded-lg border border-white/10 shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                        <img src="/logo.png" alt="Zenith Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-white tracking-widest leading-none uppercase italic">Zenith</span>
                        <span className="text-[10px] font-black text-cyan-400 tracking-[0.4em] uppercase leading-none mt-1.5 opacity-80">Terminal</span>
                    </div>
                </div>

                <div className="flex bg-zinc-950 p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => onModuleChange('bridge')}
                        className={`px-8 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${currentModule === 'bridge' ? 'bg-zinc-800 text-cyan-400 shadow-inner' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        Terminal
                    </button>
                    <button
                        onClick={onOpenMint}
                        className="px-8 py-2.5 rounded-md text-xs font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                    >
                        <Droplets className="w-3 h-3" />
                        Faucet
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden lg:flex flex-col items-end mr-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${account ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Network Status</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Polkadot Hub (Testnet)</span>
                </div>

                <button
                    onClick={handleReset}
                    title="Reset Terminal Session"
                    className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>

                <button
                    onClick={handleOpen}
                    disabled={isConnecting}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-400 border-2 border-black text-[10px] font-black text-black uppercase tracking-widest hover:bg-cyan-300 shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                    <Zap className="w-4 h-4 fill-current" />
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : (isConnecting ? 'Linking...' : 'Initialize Terminal')}
                </button>
            </div>
        </nav>
    );
};


