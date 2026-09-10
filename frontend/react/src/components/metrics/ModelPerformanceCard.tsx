import React from "react";
import { Cpu, Award, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { MetricsResponse } from "../../types/api";

interface ModelPerformanceCardProps {
  metrics: MetricsResponse;
}

export const ModelPerformanceCard: React.FC<ModelPerformanceCardProps> = ({ metrics }) => {
  return (
    <div className="cyber-card rounded-xl p-5 border border-cyan-900/30 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            Model Validation & Forecast Lead Time
          </h3>
        </div>
        <span className="text-slate-400">{metrics.dataset}</span>
      </div>

      {/* Lead Time Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Mean Lead Time</span>
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {metrics.mean_lead_time_sec.toFixed(1)}s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Average advance warning</div>
        </div>

        <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Max Lead Time</span>
          </div>
          <div className="text-xl font-bold text-purple-400 mt-1">
            {metrics.max_lead_time_sec.toFixed(1)}s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across 5-step horizon</div>
        </div>

        <div className="p-3 rounded bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Advance Warnings</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {metrics.total_advance_warnings} Cases
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Prevented attack escalation</div>
        </div>
      </div>

      {/* Accuracy Decay Across Horizons */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <div className="text-slate-300 font-bold mb-2">K-Step Prediction Accuracy Decay:</div>
        <div className="space-y-1.5">
          {Object.entries(metrics.k_step_accuracy).map(([stepKey, acc]) => {
            const pct = Math.round(acc * 100);
            return (
              <div key={stepKey} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 w-32">{stepKey}</span>
                <div className="flex-1 mx-3 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-bold text-slate-200 w-12 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
