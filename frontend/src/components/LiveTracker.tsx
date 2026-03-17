import React from 'react';
import { CheckCircle2, Clock, Loader2, ShieldCheck, Database, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type StepStatus = 'complete' | 'loading' | 'pending' | 'error';

interface TrackerStepProps {
    icon: React.ElementType;
    label: string;
    description: string;
    status: StepStatus;
    isLast?: boolean;
}

const TrackerStep: React.FC<TrackerStepProps> = ({ icon: Icon, label, description, status, isLast }) => {
    return (
        <div className="flex gap-4 group">
            <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500",
                    status === 'complete' ? "bg-primary border-primary text-background" :
                        status === 'loading' ? "bg-primary/20 border-primary text-primary animate-pulse" :
                            "bg-slate-900 border-border text-slate-500"
                )}>
                    {status === 'complete' ? <CheckCircle2 className="w-5 h-5" /> :
                        status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                            <Icon className="w-4 h-4" />}
                </div>
                {!isLast && (
                    <div className={cn(
                        "w-px h-12 my-1 transition-all duration-500",
                        status === 'complete' ? "bg-primary" : "bg-border"
                    )} />
                )}
            </div>
            <div className="pb-8">
                <h3 className={cn(
                    "text-sm font-semibold transition-colors",
                    status === 'pending' ? "text-slate-500" : "text-slate-100"
                )}>
                    {label}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] font-mono leading-relaxed group-hover:text-slate-400 transition-colors">
                    {description}
                </p>
            </div>
        </div>
    );
};

export const LiveTracker: React.FC = () => {
    return (
        <div className="glass-panel p-6 h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Live Verification</h2>
                </div>
                <div className="px-2 py-1 rounded bg-slate-900 border border-border text-[10px] font-mono text-slate-500">
                    TX: 0x8a2f...1b9e
                </div>
            </div>

            <div className="space-y-0">
                <TrackerStep
                    icon={Zap}
                    label="Intent Broadcasted"
                    description="EIP-712 Message signed & validated on Moonbeam."
                    status="complete"
                />
                <TrackerStep
                    icon={Database}
                    label="Solver Lock"
                    description="Solver bonding $PBT collateral for settlement."
                    status="complete"
                />
                <TrackerStep
                    icon={ShieldCheck}
                    label="PVM Verify: Price Guard"
                    description="Checking HydraDX EMA Oracle (90% threshold)."
                    status="loading"
                />
                <TrackerStep
                    icon={ShieldCheck}
                    label="PVM Verify: MPT Proof"
                    description="Validating storage proof against State Root."
                    status="pending"
                />
                <TrackerStep
                    icon={CheckCircle2}
                    label="Settlement Confirmed"
                    description="Funds released to destination address."
                    status="pending"
                    isLast
                />
            </div>

            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-border">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>PVM Logic Depth</span>
                    <span>74 kb</span>
                </div>
                <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                    <div className="w-[65%] h-full bg-primary animate-pulse" />
                </div>
            </div>
        </div>
    );
};
