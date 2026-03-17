import { Terminal, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SimulationStatus } from '../types/simulation';

interface Props {
    status: SimulationStatus;
    progress: number;
}

const steps = [
    { threshold: 0, msg: 'Intent binary [0xdc7f7de6] received', label: 'DECODE' },
    { threshold: 20, msg: 'PolkaVM: Executing verifier logic...', label: 'RUN' },
    { threshold: 40, msg: 'HydraDX EMA: Fetching 10m price avg', label: 'FETCH' },
    { threshold: 60, msg: 'Price Guard: 90.2% - Logic PASSED', label: 'GUARD' },
    { threshold: 80, msg: 'MPT Referee: Matching storage proof', label: 'REFEREE' },
    { threshold: 95, msg: 'Cross-VM Dispatch: Settlement confirmed', label: 'FINAL' },
];

export const ActivityLog: React.FC<Props> = ({ status, progress }) => {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest font-bold">PVM Verification Stream</span>
                </div>
                {status === 'verifying' && (
                    <div className="text-[10px] font-mono text-teal-400/80 animate-pulse">
                        SYSCALL ID: 0x2A...
                    </div>
                )}
            </div>

            <div className="space-y-6 min-h-[220px]">
                {status === 'idle' ? (
                    <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-black/10">
                        <Clock className="w-5 h-5 text-zinc-800 mb-2" />
                        <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">Awaiting intent signature...</p>
                    </div>
                ) : status === 'signing' ? (
                    <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-black/10">
                        <Loader2 className="w-5 h-5 text-teal-500/50 animate-spin mb-2" />
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">Waiting for EIP-712 Signature</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {steps.map((step, i) => {
                            const isVisible = progress >= step.threshold;
                            const isCurrent = progress >= step.threshold && (i === steps.length - 1 || progress < steps[i + 1].threshold);

                            return (
                                <AnimatePresence key={i}>
                                    {isVisible && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex gap-3"
                                        >
                                            <div className="flex flex-col items-center shrink-0 mt-0.5">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isCurrent && status !== 'success'
                                                    ? 'border-teal-500/50 text-teal-500 animate-pulse'
                                                    : 'bg-teal-500/10 border-teal-500/20 text-teal-500'
                                                    }`}>
                                                    {isCurrent && status !== 'success' ? (
                                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                    )}
                                                </div>
                                                {i < steps.length - 1 && (
                                                    <div className={`w-px flex-1 mt-1.5 transition-colors ${progress >= steps[i + 1].threshold ? 'bg-teal-500/20' : 'bg-zinc-800'
                                                        }`} style={{ minHeight: 14 }} />
                                                )}
                                            </div>
                                            <div className="min-w-0 pb-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent ? 'text-teal-400' : 'text-zinc-600'
                                                        }`}>{step.label}</span>
                                                    {isCurrent && status !== 'success' && (
                                                        <span className="text-[8px] font-mono text-zinc-500 lowercase italic">processing...</span>
                                                    )}
                                                </div>
                                                <p className={`text-xs font-mono leading-snug transition-colors ${isCurrent ? 'text-zinc-100' : 'text-zinc-500'
                                                    }`}>{step.msg}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold tracking-tighter">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'idle' ? 'bg-zinc-800' : 'bg-teal-400 animate-pulse'}`} />
                    <span className="text-zinc-600 uppercase tracking-widest">PVM STATUS:</span>
                    <span className={status === 'success' ? 'text-teal-400' : 'text-zinc-500'}>
                        {status === 'idle' ? 'STANDBY' : status === 'success' ? 'VERIFIED' : 'ACTIVE_LOGIC'}
                    </span>
                </div>
                <span className="text-zinc-800">SHA-256: 0x8f874cA...Ffaa</span>
            </div>
        </div>
    );
};
