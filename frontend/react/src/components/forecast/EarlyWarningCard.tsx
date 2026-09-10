import React from "react";
import { Clock, ShieldCheck, ArrowRight, Zap, AlertCircle, HelpCircle } from "lucide-react";
import { LeadTimeEvaluation } from "../../types/api";
import { CYBER_TOOLTIPS } from "../../utils/taxonomy";

interface EarlyWarningCardProps {
  evaluations: LeadTimeEvaluation[];
  durationSec?: number;
  onExploreDefense?: () => void;
}

export const EarlyWarningCard: React.FC<EarlyWarningCardProps> = ({
  evaluations,
  durationSec = 20,
  onExploreDefense,
}) => {
  // Extract real calculated lead time from evaluations
  const hasEvaluations = evaluations && evaluations.length > 0;
  const latestEvaluation = hasEvaluations ? evaluations[0] : null;

  // Real backend lead time in seconds (or null if unavailable)
  const realLeadTimeSec = latestEvaluation ? latestEvaluation.lead_time_sec : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* SECTION 4: Prominent Early Warning Card (7 cols) */}
      <div className="lg:col-span-7 cyber-card rounded-2xl p-6 sm:p-7 border border-emerald-500/40 bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-cyber-950/90 shadow-xl relative overflow-hidden flex flex-col justify-between">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base sm:text-lg font-black text-slate-100 uppercase font-sans tracking-tight">
                EARLY WARNING
              </h3>
            </div>
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 group relative cursor-help"
              title={CYBER_TOOLTIPS.leadTime}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Advance Horizon</span>
              <HelpCircle className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
              
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-64 p-2.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-[11px] text-slate-200 font-sans shadow-2xl">
                {CYBER_TOOLTIPS.leadTime}
              </div>
            </div>
          </div>

          {/* Core Metric Display */}
          <div className="my-5">
            {hasEvaluations && realLeadTimeSec !== null ? (
              <div className="space-y-2">
                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
                    {realLeadTimeSec.toFixed(0)} seconds
                  </span>
                  <span className="text-xs font-mono uppercase text-emerald-300/80 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Verified Advance
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  The system identified a possible next attack stage approximately{" "}
                  <strong className="text-emerald-300 font-mono">
                    {realLeadTimeSec.toFixed(0)} seconds
                  </strong>{" "}
                  before it appeared in the observed traffic.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-300">
                  Lead time will appear after evaluation.
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  The single-step advance window is <strong className="text-cyan-400 font-mono">+{durationSec}s</strong>.
                  Advance the replay scrubber to confirm predictions against arriving traffic telemetry.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Educational Note */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-sans font-medium text-slate-300">
              More warning time gives defenders more time to respond.
            </span>
          </div>
          {hasEvaluations && (
            <span className="text-slate-400 text-[11px]">
              {evaluations.filter((e) => e.is_correct).length} / {evaluations.length} stages confirmed
            </span>
          )}
        </div>
      </div>

      {/* SECTION 8: Why Does This Matter & Explore Defense CTA (5 cols) */}
      <div className="lg:col-span-5 cyber-card rounded-2xl p-6 sm:p-7 border border-indigo-500/40 bg-gradient-to-br from-slate-900/90 via-indigo-950/20 to-cyber-950/90 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800/80">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base sm:text-lg font-black text-slate-100 uppercase font-sans tracking-tight">
              WHY DOES THIS MATTER?
            </h3>
          </div>

          <div className="my-4 space-y-3">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Prediction is useful because it gives a security team time to investigate or simulate a response before the attack progresses.
            </p>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1.5 font-sans">
              <div className="text-indigo-300 font-semibold flex items-center space-x-1.5">
                <span>Actionable Countermeasures</span>
              </div>
              <p>
                Rather than scrambling after a breach is executed, you can simulate firewall blockades, host isolation, or socket throttling proactively.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={onExploreDefense}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-950/50 hover:shadow-cyan-900/40 transition-all duration-200 group"
          >
            <span>Explore Defense Simulation</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
