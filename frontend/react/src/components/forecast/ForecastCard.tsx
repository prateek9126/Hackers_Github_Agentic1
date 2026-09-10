import React from "react";
import { TrendingUp, Clock, HelpCircle, ArrowRight, ShieldAlert, Cpu } from "lucide-react";
import { ForecastResponse } from "../../types/api";
import { getStageInfo, CYBER_TOOLTIPS } from "../../utils/taxonomy";

interface ForecastCardProps {
  forecast: ForecastResponse;
  currentStage?: string;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast, currentStage }) => {
  const currentStageName = currentStage || forecast.current_stage || "BENIGN";
  const nowStageInfo = getStageInfo(currentStageName);

  // Label sequence helper
  const getStepTimingLabel = (index: number) => {
    switch (index) {
      case 0:
        return "NEXT (+20s)";
      case 1:
        return "AFTER THAT (+40s)";
      case 2:
        return "LATER (+60s)";
      case 3:
        return "HORIZON (+80s)";
      case 4:
        return "HORIZON (+100s)";
      default:
        return `STEP t+${index + 1}`;
    }
  };

  return (
    <div className="cyber-card rounded-2xl p-6 sm:p-7 border border-purple-500/40 bg-gradient-to-b from-slate-900/95 via-purple-950/20 to-cyber-950/95 shadow-2xl relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800/80 gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight font-sans">
              WHAT COULD HAPPEN NEXT?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Unlike a traditional alert that tells you something suspicious is happening now, this system looks at how activity is changing over time and forecasts possible next steps.
          </p>
        </div>

        {/* AI Forecasting Engine Capsule (Section 10 Requirement) */}
        <div
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-purple-500/40 text-xs font-mono text-purple-300 self-start md:self-center group relative cursor-help"
          title={CYBER_TOOLTIPS.lstm}
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold text-slate-200">AI Forecasting Engine</span>
          <span className="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 text-[10px] font-bold border border-purple-500/40">
            LSTM
          </span>
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />

          {/* LSTM Tooltip */}
          <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-72 p-3 rounded-xl bg-slate-900 border border-purple-500/50 text-[11px] text-slate-200 font-sans shadow-2xl leading-relaxed">
            {CYBER_TOOLTIPS.lstm}
          </div>
        </div>
      </div>

      {/* Attack Progression Sequence Flow: NOW -> NEXT -> AFTER THAT -> LATER */}
      <div className="mt-6 relative z-10">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
          <span className="font-semibold text-slate-300">Predicted Progression Trajectory</span>
          <span className="text-[11px] text-purple-400 font-mono">Temporal Multi-Horizon (K = {forecast.forecast_horizon || 5})</span>
        </div>

        {/* Step Progression Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5">
          {/* 1. NOW Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40 flex flex-col justify-between shadow-lg relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono">
              <span className="font-bold text-cyan-400">NOW</span>
              <span className="text-[10px] uppercase text-cyan-400/80 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                Observed
              </span>
            </div>

            <div className="my-3 space-y-1">
              <div className="text-sm font-black font-mono text-slate-100 truncate" title={currentStageName}>
                {nowStageInfo.technicalName}
              </div>
              <div className="text-xs font-bold text-cyan-300">
                {nowStageInfo.plainEnglishTitle}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug pt-1">
                {nowStageInfo.shortDescription}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>Active Baseline</span>
              <span className="text-cyan-400 font-bold">100%</span>
            </div>
          </div>

          {/* 2-6. K Forecast Steps */}
          {forecast.forecast.map((step, idx) => {
            const stepInfo = getStageInfo(step.stage);
            const pct = Math.round(step.probability * 100);
            const isHigh = pct >= 50;
            const isModerate = pct >= 25 && pct < 50;

            const cardBorder = isHigh
              ? "border-rose-500/40 bg-rose-950/20"
              : isModerate
              ? "border-amber-500/40 bg-amber-950/20"
              : "border-slate-800 bg-slate-950/60";

            return (
              <div
                key={step.step}
                className={`p-4 rounded-xl border ${cardBorder} flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-md`}
              >
                {/* Step Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs font-mono">
                  <span className="font-bold text-slate-200">
                    {getStepTimingLabel(idx)}
                  </span>
                  <span className="flex items-center space-x-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>+{step.step * 20}s</span>
                  </span>
                </div>

                {/* Stage Names and Plain-English Description */}
                <div className="my-3 space-y-1">
                  <div className="text-sm font-black font-mono text-slate-100 truncate" title={step.stage}>
                    {stepInfo.technicalName}
                  </div>
                  <div className={`text-xs font-bold ${isHigh ? "text-rose-300" : isModerate ? "text-amber-300" : "text-slate-300"}`}>
                    {stepInfo.plainEnglishTitle}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug pt-1">
                    "{stepInfo.shortDescription}"
                  </p>
                </div>

                {/* Likelihood bar */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-xl font-black text-slate-100">{pct}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">likely</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? "bg-rose-500" : isModerate ? "bg-amber-400" : "bg-cyan-400"
                      }`}
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
