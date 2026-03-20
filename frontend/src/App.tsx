import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { IntentWidget } from './components/IntentWidget';
import { ActivityLog } from './components/ActivityLog';
import { EMAChart } from './components/EMAChart';
import { Database, Terminal, Activity, Users } from 'lucide-react';
import { SuccessModal } from './components/SuccessModal';
import { listenForSettlement } from './utils/web3';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAppKitAccount } from '@reown/appkit/react';

import { Faucet } from './components/Faucet';
import { MintModal } from './components/MintModal';

import type { SimulationStatus } from './types/simulation';

type Module = 'bridge' | 'faucet';

function App() {
  const [activeTab, setActiveTab] = useState<'trace' | 'ema'>('trace');
  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [amount, setAmount] = useState('100');
  const [showModal, setShowModal] = useState(false);
  const [blockHeight, setBlockHeight] = useState(1420935);
  const [liveRate] = useState(1.0);
  const [currentModule, setCurrentModule] = useState<Module>('bridge');
    const [showMintModal, setShowMintModal] = useState(false);
    const [txDetails, setTxDetails] = useState({
      sourceSymbol: 'USDT',
      destSymbol: 'PAS',
      sourceChain: 'Polkadot Hub',
      destChain: 'AssetHub'
    });

  // Wallet State (Managed by AppKit with Resilient Fallback)
  const { address, isConnected } = useAppKitAccount();
  const [account, setAccount] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);

  useEffect(() => {
    const syncAccount = () => {
      const ethereum = (window as any).ethereum;
      const injectedAddress = ethereum?.selectedAddress || (ethereum?.accounts?.[0]);
      const finalAccount = address || injectedAddress || null;

      if (finalAccount !== account) {
        if (typeof finalAccount === 'string') {
          console.log("Syncing account state:", `Connected (${finalAccount.slice(0, 8)}...)`);
        } else {
          console.log("Syncing account state:", finalAccount ? "Connected (Unknown ID)" : "Disconnected");
        }
        setAccount(finalAccount);
        if (finalAccount) setIsLiveMode(true);
      }
    };

    syncAccount();
    const interval = setInterval(syncAccount, 500); // Higher frequency polling

    const ethereum = (window as any).ethereum;
    ethereum?.on?.('accountsChanged', syncAccount);
    ethereum?.on?.('chainChanged', syncAccount);

    return () => {
      clearInterval(interval);
      ethereum?.removeListener?.('accountsChanged', syncAccount);
      ethereum?.removeListener?.('chainChanged', syncAccount);
    };
  }, [address, isConnected, account]);


  const [txHash, setTxHash] = useState<string | null>(null);

  const stats = useMemo(() => [
    { label: 'Network Surety', value: '99.9%', color: 'text-teal-400', icon: Activity },
    { label: 'Total Volume', value: `$${(25.4 + (blockHeight % 100) * 0.001).toFixed(2)}M`, color: 'text-blue-400', icon: Activity },
    { label: 'Active Solvers', value: '18 Nodes', color: 'text-purple-400', icon: Users },
    { label: 'Bonded Collateral', value: '840k PBT', color: 'text-amber-400', icon: Database },
  ], [blockHeight]);

  useEffect(() => {
    const timer = setInterval(() => setBlockHeight(h => h + 1), 6000);
    return () => clearInterval(timer);
  }, []);

  // Listen for settlement events in live mode
  useEffect(() => {
    if (isLiveMode && simStatus === 'verifying') {
      const unsubscribe = listenForSettlement((hash) => {
        console.log("Settlement detected on-chain:", hash);
        setProgress(100);
        setSimStatus('success');
        setTimeout(() => setShowModal(true), 1500);
      });
      return () => unsubscribe();
    }
  }, [isLiveMode, simStatus]);


  // Fallback logging
  useEffect(() => {
    if (!account && (window as any).ethereum?.selectedAddress) {
      console.warn("Account mismatch: ethereum.selectedAddress exists but state is null!");
    }
  }, [account]);

  // Sync isLiveMode with connection and log for debug
  useEffect(() => {
    if (isConnected) {
      setIsLiveMode(true);
      console.log("Wallet synchronized via AppKit:", address);
    }
  }, [isConnected, address]);

  const startSimulation = () => {
    if (simStatus !== 'idle') return;
    setSimStatus('signing');
    setProgress(0);
    setActiveTab('trace');
  };

  const resetSimulation = () => {
    setSimStatus('idle');
    setProgress(0);
    setShowModal(false);
    setTxHash(null);
  };

  useEffect(() => {
    let interval: any;
    if (simStatus === 'signing') {
      if (!isLiveMode) {
        interval = setTimeout(() => setSimStatus('verifying'), 1500);
      }
      // In live mode, IntentWidget handleSign sets 'verifying' after tx is sent
    } else if (simStatus === 'verifying') {
      if (!isLiveMode) {
        interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              setSimStatus('success');
              setTimeout(() => setShowModal(true), 1000);
              return 100;
            }
            return prev + 2;
          });
        }, 50);
      } else {
        // In live mode, progress faster to 50% then crawl while waiting for event
        interval = setInterval(() => {
          setProgress((prev) => {
            if (prev < 50) return prev + 2; // Faster initial ramp
            if (prev < 90) return prev + 0.5; // Slow crawl
            return prev;
          });
        }, 100);
      }
    }
    return () => clearInterval(interval);
  }, [simStatus, isLiveMode]);

  return (
    <div className="min-h-screen">
      <ToastContainer theme="dark" position="top-right" />
      <Navbar 
        account={account} 
        currentModule={currentModule} 
        onModuleChange={setCurrentModule} 
        onOpenMint={() => setShowMintModal(true)}
      />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 pt-12 pb-24">
        <div className="module-container">
          {currentModule === 'bridge' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: Stats & Diagnostics */}
              <div className="lg:col-span-4 space-y-8">
                <div className="brutalist-card p-8 bg-zinc-900 shadow-2xl">
                   <div className="flex items-center gap-3 mb-8">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em]">Network Snapshot</h2>
                   </div>
                   <div className="space-y-5">
                      {stats.map((stat, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                           <div className="flex items-center gap-4">
                              <stat.icon className="w-4 h-4 text-zinc-600" />
                              <span className="text-xs font-bold text-zinc-500 uppercase">{stat.label}</span>
                           </div>
                           <span className={`text-sm font-mono font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="brutalist-card p-8 bg-zinc-900 border-2 border-black">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-violet-400" />
                        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em]">PVM Health</h2>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                   </div>
                   <div className="h-40 border border-zinc-800 rounded bg-black/40 p-4 font-mono text-xs text-zinc-600 overflow-hidden leading-relaxed">
                      [SYS] PolkaVM Runtime: ACTIVE<br/>
                      [IO] MPT Referee: SYNCED<br/>
                      [SEC] EMA Guard: ENFORCING<br/>
                      [NET] Multi-Node Consensus: 18/18<br/>
                      <span className="text-teal-500/50">{' > '} Awaiting next syscall...</span>
                   </div>
                </div>
              </div>

              {/* Center/Right Column: Intent Widget & Logs */}
              <div className="lg:col-span-8">
                <IntentWidget
                  onSign={startSimulation}
                  status={simStatus}
                  onAmountChange={(val) => setAmount(val)}
                  account={account}
                  isLiveMode={isLiveMode}
                  onTxSuccess={(hash: string, details: any) => {
                    setTxHash(hash);
                    if (details) setTxDetails(details);
                    setSimStatus('success');
                    setTimeout(() => setShowModal(true), 800);
                  }}
                  onStatusChange={(status: SimulationStatus) => setSimStatus(status)}
                />

                {/* Verification Logs below widget */}
                <div className="mt-10 brutalist-card overflow-hidden bg-zinc-900 shadow-2xl border-2 border-black">
                  <div className="border-b-2 border-black flex">
                    <button
                      onClick={() => setActiveTab('trace')}
                      className={`px-10 py-5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'trace' ? 'bg-zinc-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      Verification Trace
                    </button>
                    <button
                      onClick={() => setActiveTab('ema')}
                      className={`px-10 py-5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ema' ? 'bg-zinc-800 text-violet-400 border-b-2 border-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      EMA Protection
                    </button>
                  </div>
                  <div className="min-h-[400px]">
                    {activeTab === 'trace' ? (
                      <ActivityLog status={simStatus} progress={progress} />
                    ) : (
                      <EMAChart />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <Faucet account={account} />
          )}
        </div>
      </main>

      <footer className="border-t border-white/5 bg-black/40 backdrop-blur-md relative z-10 px-6 lg:px-10 h-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
           <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">Secured by PolkaVM High-Symmetry Proofs</span>
           <div className="hidden md:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono text-zinc-800 uppercase">Mainnet Shadow Live</span>
           </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-800 tracking-tighter uppercase font-black italic">Zenith Protocol v1.0.42</span>
      </footer>

        {showModal && (
          <SuccessModal
            isOpen={showModal}
            onClose={resetSimulation}
            amount={amount}
            txHash={txHash}
            liveRate={liveRate}
            {...txDetails}
          />
        )}

        <MintModal 
          isOpen={showMintModal}
          onClose={() => setShowMintModal(false)}
          account={account}
        />
    </div>
  );
}

export default App;
