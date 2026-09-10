import React from "react";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { LeadTimeEvaluation } from "../../types/api";

interface LeadTimeScoreboardProps {
  evaluations: LeadTimeEvaluation[];
  currentStage: string;
  currentStep: number;
}

export const LeadTimeScoreboard: React.FC<LeadTimeScoreboardProps> = ({
  evaluations,
  currentStage,
  currentStep,
}) => {
  if (evaluations.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>
            Current step #{currentStep} is the baseline window. Advance forward to evaluate advance predictions!
          </span>
        </div>
        <span className="text-slate-500">Awaiting future verification</span>
      </div>
    );
  }

  return (
    <div className="cyber-card rounded-xl p-5 border border-emerald-500/40 font-mono text-xs shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            Forecast Scorecard &bull; Lead-Time Verification
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
          <Zap className="w-3.5 h-3.5" />
          <span>Evaluating predictions made at prior timesteps for Step #{currentStep}</span>
        </div>
      </div>

      {/* Evaluations list */}
      <div className="mt-4 space-y-3">
        {evaluations.map((ev, i) => {
          const isGtAvailable = ev.is_ground_truth_available !== false && ev.actual_stage !== "UNAVAILABLE";

          return (
            <div
              key={i}
              className={`p-4 rounded-lg border transition-all ${
                !isGtAvailable
                  ? "bg-slate-900/60 border-cyan-500/30 text-slate-300"
                  : ev.is_correct
                  ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-300"
                  : "bg-amber-950/20 border-amber-500/50 text-amber-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      !isGtAvailable
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : ev.is_correct
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-amber-500 text-slate-950"
                    }`}
                  >
                    {!isGtAvailable
                      ? "UNLABELED TELEMETRY FORECAST"
                      : ev.is_correct
                      ? "SUCCESSFUL ADVANCE FORECAST"
                      : "PREDICTION DIVERGENCE"}
                  </span>
                  <span className="font-bold text-slate-200">
                    Lead Time: <strong className="text-cyan-400">+{ev.lead_time_sec.toFixed(1)}s</strong> advance target
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Predicted at Step #{ev.predicted_at_step} &rarr; Target Window Step #{ev.current_step}
                </div>
              </div>

              {/* Side by side: Prior Prediction vs Actual Arrival */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* Prior Prediction */}
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">
                    Prior Model Forecast (at t - {ev.lead_time_sec}s)
                  </div>
                  <div className="text-base font-bold text-purple-300 mt-1 flex items-center justify-between">
                    <span>{ev.predicted_stage}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      Conf: {Math.round(ev.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Newly Revealed Ground Truth */}
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">
                    Actual Ground Truth Status
                  </div>
                  <div className="text-base font-bold mt-1 flex items-center justify-between">
                    <span className={isGtAvailable ? "text-emerald-300" : "text-slate-400 italic font-medium"}>
                      {isGtAvailable ? ev.actual_stage : "UNAVAILABLE"}
                    </span>
                    <span className="text-xs text-slate-400 font-normal flex items-center space-x-1">
                      {isGtAvailable ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{ev.is_correct ? "Match Verified" : "Different"}</span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[10px] uppercase">Unlabeled Capture</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Natural sentence message */}
              <div className="mt-2 text-[11px] text-slate-400">
                {ev.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
