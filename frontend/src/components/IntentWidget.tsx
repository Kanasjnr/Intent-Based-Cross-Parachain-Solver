import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Loader2, Activity, ChevronDown } from 'lucide-react';
import { signAndLockIntent, getTokenBalance, getLivePrice, ensureCorrectNetwork } from '../utils/web3';
import { useAppKitProvider } from '@reown/appkit/react';
import { CHAINS, ASSETS } from '../constants/config';
import type { SimulationStatus } from '../types/simulation';
import { toast } from 'react-toastify';

interface Props {
    onSign: () => void;
    onAmountChange: (val: string) => void;
    status: SimulationStatus;
    account: string | null;
    isLiveMode: boolean;
    onTxSuccess: (hash: string, details?: any) => void;
    onStatusChange: (status: SimulationStatus) => void;
}

export const IntentWidget: React.FC<Props> = ({
    onSign,
    onAmountChange,
    status,
    account,
    isLiveMode,
    onTxSuccess,
    onStatusChange
}) => {
    const [amount, setLocalAmount] = useState('100');
    const [balance, setBalance] = useState('0.00');
    const [liveRate, setLiveRate] = useState(1.0);

    // Selection State
    const [fromChain, setFromChain] = useState(CHAINS[0]); // Polkadot Hub
    const [toChain, setToChain] = useState(CHAINS[3]);   // AssetHub
    const [sourceAsset, setSourceAsset] = useState(ASSETS[2]); // PAS
    const [destAsset, setDestAsset] = useState(ASSETS[0]);   // USDT

    const [openSelect, setOpenSelect] = useState<'fromChain' | 'toChain' | 'sourceAsset' | 'destAsset' | null>(null);

    const { walletProvider } = useAppKitProvider('eip155');

    useEffect(() => {
        const fetchBalance = async () => {
            if (account) {
                try {
                    const addr = sourceAsset.address === '0x0000000000000000000000000000000000000000'
                        ? '0x0000000000000000000000000000000000000000'
                        : sourceAsset.address;
                    const bal = await getTokenBalance(addr, account);
                    setBalance(bal);
                } catch (e) {
                    console.error("Balance fetch error:", e);
                }
            }
        };
        const fetchRate = async () => {
            const rate = await getLivePrice(sourceAsset.symbol, destAsset.symbol);
            setLiveRate(rate);
        };
        fetchBalance();
        fetchRate();
        const interval = setInterval(() => {
            fetchBalance();
            fetchRate();
        }, 10000);
        return () => clearInterval(interval);
    }, [account, sourceAsset, destAsset]);

    const isDisabled = status !== 'idle';

    const getQuote = () => {
        return (Number(amount) * liveRate).toFixed(2);
    };

    const handleAmountChange = (val: string) => {
        setLocalAmount(val);
        onAmountChange(val);
    };

    const handleSign = async () => {
        if (!isLiveMode) {
            onSign();
            return;
        }

        if (!account) {
            toast.error("Connect wallet first!");
            return;
        }

        let activeProvider = walletProvider;

        if (!activeProvider && (window as any).ethereum) {
            activeProvider = (window as any).ethereum;
        }

        if (!activeProvider) {
            toast.info("Synchronizing Account...", {
                position: "bottom-right",
                autoClose: 3000,
                theme: "dark",
            });
            return;
        }

        try {
            await ensureCorrectNetwork(activeProvider);

            const hash = await signAndLockIntent(
                {
                    amount,
                    sourceAsset: sourceAsset.address,
                    destChainId: toChain.id,
                    destAsset: destAsset.address,
                    minDestAmount: (Number(amount) * liveRate * 0.95).toFixed(6), // 5% slippage
                },
                account,
                activeProvider,
                onStatusChange
            );
            toast.success("Intent locked on-chain!");
            onTxSuccess(hash, {
                sourceSymbol: sourceAsset.symbol,
                destSymbol: destAsset.symbol,
                sourceChain: fromChain.name,
                destChain: toChain.name
            });
        } catch (error: any) {
            let displayError = "Protocol interaction failed";
            if (error?.data?.message) {
                displayError = error.data.message.split('revert: ')[1] || error.data.message;
            } else if (error?.reason) {
                displayError = error.reason;
            } else if (error?.message) {
                displayError = error.message.split('.')[0];
            }

            toast.error(displayError, {
                position: "bottom-right",
                autoClose: 5000,
                theme: "dark",
            });
            onStatusChange('idle');
        }
    };

    const Selector = ({
        current,
        options,
        onSelect,
        isOpen,
        id,
        disabled
    }: any) => (
        <div className="relative">
            <button
                disabled={disabled}
                onClick={() => setOpenSelect(isOpen ? null : id)}
                className="flex items-center gap-3 bg-zinc-800/50 hover:bg-zinc-800 px-4 py-2.5 rounded-lg border border-white/5 transition-colors"
            >
                {current.iconColor && <div className={`w-4 h-4 rounded-full ${current.iconColor}`} />}
                {!current.iconColor && <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-xs font-bold">{current.icon}</div>}
                <span className="text-sm font-bold text-white uppercase tracking-wider">{current.name || current.symbol}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-3 w-64 bg-zinc-900 border-2 border-black rounded-xl shadow-2xl overflow-hidden py-2">
                    {options.map((opt: any) => (
                        <button
                            key={opt.id || opt.symbol}
                            onClick={() => {
                                onSelect(opt);
                                setOpenSelect(null);
                            }}
                            className="w-full px-5 py-4 text-left hover:bg-zinc-800 flex items-center gap-4 transition-colors border-b border-zinc-800/50 last:border-none"
                        >
                            {opt.iconColor && <div className={`w-4 h-4 rounded-full ${opt.iconColor} ring-1 ring-white/10`} />}
                            {!opt.iconColor && <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold border border-white/10 text-white">{opt.icon}</div>}
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white leading-none uppercase">{opt.symbol || opt.name}</span>
                                {opt.name && opt.symbol && <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">{opt.name}</span>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="brutalist-card bg-zinc-900 border-2 border-black overflow-hidden shadow-[12px_12px_0px_#000]">
            {/* Header */}
            <div className="px-8 py-6 bg-black border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-400 border-2 border-black flex items-center justify-center rotate-3 shadow-[3px_3px_0px_#000]">
                        <Zap className="w-6 h-6 text-black fill-current" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-widest italic">Cross-Chain Intent Bridge</h2>
                </div>
                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 border border-zinc-800">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">MEV Guard: Active</span>
                </div>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                {/* Connector Line (Decorative) */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-12 h-12 bg-black border-2 border-zinc-700 rounded-full flex items-center justify-center shadow-[6px_6px_0px_#000]">
                        <ChevronDown className="w-6 h-6 text-cyan-400 -rotate-90" />
                    </div>
                </div>

                {/* STEP 1: SOURCE */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <span className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs font-black text-zinc-400 uppercase tracking-widest leading-none">Step 01</span>
                        <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Define Swap</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="brutalist-card bg-black p-6 border-2 border-zinc-800">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 block italic">From Network</label>
                            <Selector
                                id="fromChain"
                                current={fromChain}
                                options={CHAINS}
                                onSelect={setFromChain}
                                isOpen={openSelect === 'fromChain'}
                                disabled={isDisabled}
                            />
                        </div>

                        <div className="brutalist-card bg-black p-8 border-2 border-zinc-800 shadow-[6px_6px_0px_#000]">
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block italic">Asset & Amount</label>
                                <span className="text-xs font-mono text-zinc-400 font-bold bg-zinc-900/50 px-2 py-0.5 rounded border border-white/5">Balance: {balance}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Selector
                                    id="sourceAsset"
                                    current={sourceAsset}
                                    options={ASSETS}
                                    onSelect={setSourceAsset}
                                    isOpen={openSelect === 'sourceAsset'}
                                    disabled={isDisabled}
                                />
                                <input
                                    type="number"
                                    className="bg-transparent border-none focus:outline-none text-right w-full text-4xl font-black text-white placeholder-zinc-800"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    disabled={isDisabled}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* STEP 2: DESTINATION */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <span className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs font-black text-zinc-400 uppercase tracking-widest leading-none">Step 02</span>
                        <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Execute Settlement</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="brutalist-card bg-black p-8 border-2 border-zinc-800 shadow-[6px_6px_0px_#000]">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 block italic">To Network</label>
                            <Selector
                                id="toChain"
                                current={toChain}
                                options={CHAINS}
                                onSelect={setToChain}
                                isOpen={openSelect === 'toChain'}
                                disabled={isDisabled}
                            />
                        </div>

                        <div className="brutalist-card bg-zinc-800/10 p-8 border-2 border-dashed border-zinc-800 shadow-[6px_6px_0px_#000]">
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-xs font-black text-zinc-700 uppercase tracking-widest block italic">Est. Received</label>
                                <span className="text-xs font-mono text-zinc-500 font-bold bg-zinc-800/50 px-2 py-0.5 rounded border border-white/5">Slippage: 0.5%</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Selector
                                    id="destAsset"
                                    current={destAsset}
                                    options={ASSETS}
                                    onSelect={setDestAsset}
                                    isOpen={openSelect === 'destAsset'}
                                    disabled={isDisabled}
                                />
                                <div className="flex-1 text-right">
                                    <span className="text-4xl font-black text-white">{getQuote()}</span>
                                </div>
                            </div>
                            <div className="mt-6 text-[10px] font-mono text-zinc-500 text-right">
                                1 {sourceAsset.symbol} ≈ {liveRate.toFixed(4)} {destAsset.symbol}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Banner */}
            <div className="px-10 pb-10 pt-4">
                <div className="brutalist-card bg-black p-8 border-2 border-black shadow-[6px_6px_0px_#000] space-y-6">
                    <div className="flex items-center justify-between text-xs font-black text-zinc-600 tracking-widest uppercase mb-4">
                        <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            Simulation Health: <span className="text-emerald-500 italic">Optimum (PolkaVM v6)</span>
                        </div>
                        <div>Protocol_v1.0.42_STABLE</div>
                    </div>

                    <button
                        onClick={handleSign}
                        disabled={isDisabled || !amount}
                        className={`w-full py-7 brutalist-button flex items-center justify-center gap-4 text-2xl transition-all ${isDisabled ? 'opacity-50 !shadow-none !translate-x-0 !translate-y-0 cursor-wait bg-zinc-800 grayscale' : ''
                            }`}
                    >
                        {status === 'idle' ? (
                            <>
                                <Zap className="w-6 h-6 fill-current" />
                                Initiate Bridge Intent
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                {status.toUpperCase()}...
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Footer Metadata */}
            <div className="bg-zinc-950 px-10 py-5 border-t-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">PVM Runtime: Confirmed</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="w-3 h-3 bg-violet-500 rounded-full" />
                        <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Solver: node_Acura_1</span>
                    </div>
                </div>
                <div className="text-xs font-mono text-zinc-800 tracking-tighter">MPT_REF_VER_0x8F87...CFAA</div>
            </div>
        </div>
    );
};


