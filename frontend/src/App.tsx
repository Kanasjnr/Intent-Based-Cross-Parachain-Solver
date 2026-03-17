import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IntentWidget } from './components/IntentWidget';
import { ActivityLog } from './components/ActivityLog';
import { EMAChart } from './components/EMAChart';
import { Database, ChevronRight, Terminal, Activity, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SuccessModal } from './components/SuccessModal';

import type { SimulationStatus } from './types/simulation';

const stats = [
  { label: 'Network Surety', value: '99.9%', color: 'text-teal-400', icon: Activity },
  { label: 'Total Volume', value: '$25.4M', color: 'text-blue-400', icon: Activity },
  { label: 'Active Solvers', value: '18 Nodes', color: 'text-purple-400', icon: Users },
  { label: 'Bonded Collateral', value: '840k PBT', color: 'text-amber-400', icon: Database },
];

function App() {
  const [activeTab, setActiveTab] = useState<'trace' | 'ema'>('trace');
  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [amount, setAmount] = useState('100');
  const [showModal, setShowModal] = useState(false);
  const [blockHeight, setBlockHeight] = useState(1420935);

  useEffect(() => {
    const timer = setInterval(() => setBlockHeight(h => h + 1), 6000);
    return () => clearInterval(timer);
  }, []);

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
  };

  useEffect(() => {
    let interval: any;
    if (simStatus === 'signing') {
      interval = setTimeout(() => setSimStatus('verifying'), 1500);
    } else if (simStatus === 'verifying') {
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
    }
    return () => clearInterval(interval);
  }, [simStatus]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-400 antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-16 pb-12">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            <span className="w-1 h-1 rounded-full bg-teal-400 inline-block animate-pulse" />
            Polkadot Hub Mainnet-Shadow
          </div>
          <div className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
            Block: #{blockHeight.toLocaleString()}
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
          Protocol Console
        </h1>
        <p className="text-zinc-500 max-w-md leading-relaxed">
          The first intent-based settlement network secured by PolkaVM. Mathematical surety for cross-chain execution.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT Column ── */}
          <div className="space-y-4">
            <IntentWidget
              onSign={startSimulation}
              onReset={resetSimulation}
              status={simStatus}
              onAmountChange={(val) => setAmount(val)}
            />

            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-zinc-800 border border-white/5">
                  <Database className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Solver Identity</p>
                  <p className="text-[10px] font-mono text-zinc-600 mt-0.5">Acura_Node#01 · Multi-provenance</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700" />
            </div>

            <div className="bg-zinc-900/60 border border-white/5 border-dashed rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-600" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scale Encoding (ABI)</h3>
              </div>
              <pre className="bg-black/40 p-4 rounded-xl text-[11px] font-mono leading-relaxed text-zinc-500 border border-white/5 overflow-x-auto">
                {`struct Intent {
  source: ChainId,
  target: ChainId,
  asset_id: u32,
  amount: u128,
  mev_guard_ref: [u8; 32]
}`}
              </pre>
            </div>
          </div>

          {/* ── RIGHT Column ── */}
          <div className="space-y-4">
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="flex border-b border-white/5 bg-black/10">
                {(['trace', 'ema'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3.5 text-xs font-semibold uppercase tracking-widest transition-all ${activeTab === tab
                      ? 'text-teal-400 border-b-2 border-teal-400 -mb-px bg-teal-400/5'
                      : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                  >
                    {tab === 'trace' ? 'Verification Trace' : 'EMA Guard'}
                  </button>
                ))}
              </div>

              <div className="min-h-[300px]">
                <AnimatePresence mode="wait">
                  {activeTab === 'trace' ? (
                    <motion.div
                      key="trace"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ActivityLog
                        status={simStatus}
                        progress={progress}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ema"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <EMAChart />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</p>
                    <Icon className="w-3 h-3 text-zinc-700" />
                  </div>
                  <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <footer className="border-t border-white/5 px-6 lg:px-10 h-10 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">Secured by PolkaVM</span>
        <span className="text-[10px] font-mono text-zinc-800 tracking-tighter">Verifier: 0x8f87...cfaa</span>
      </footer>

      <AnimatePresence>
        {showModal && (
          <SuccessModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            amount={amount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
