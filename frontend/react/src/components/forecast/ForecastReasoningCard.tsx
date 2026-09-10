import React, { useState } from "react";
import { HelpCircle, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Layers, Activity, Search } from "lucide-react";
import { CurrentStateResponse, ExplanationResponse } from "../../types/api";
import { translateFeatureToPlainEnglish, getStageInfo } from "../../utils/taxonomy";

interface ForecastReasoningCardProps {
  state: CurrentStateResponse;
  predictedStage?: string;
  explanation?: ExplanationResponse | null;
}

export const ForecastReasoningCard: React.FC<ForecastReasoningCardProps> = ({
  state,
  predictedStage = "EXPLOITATION",
  explanation,
}) => {
  const [showTechnical, setShowTechnical] = useState<boolean>(false);
  const stageInfo = getStageInfo(predictedStage);

  // Generate plain English reasons from ACTUAL telemetry data:
  // 1. If explanation.top_signals is available, use those features and values
  // 2. Otherwise use state.top_features
  const signalsToRender = explanation?.top_signals && explanation.top_signals.length > 0
    ? explanation.top_signals.map((s) => ({
        feature: s.feature_name,
        value: s.observed_value,
        score: s.attribution_score,
        direction: s.direction,
        explanationText: s.explanation_text,
        ...translateFeatureToPlainEnglish(s.feature_name, s.observed_value),
      }))
    : Object.entries(state.top_features || {}).map(([feat, val]) => ({
        feature: feat,
        value: val,
        score: Math.abs(val) * 0.15,
        direction: val > 0 ? "INCREASES_RISK" : "DECREASES_RISK",
        explanationText: undefined,
        ...translateFeatureToPlainEnglish(feat, val),
      }));

  return (
    <div className="cyber-card rounded-2xl p-6 sm:p-7 border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 to-cyber-950/95 shadow-xl space-y-6">
      {/* Header (Section 7 Requirement) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg sm:text-xl font-black text-slate-100 uppercase tracking-tight font-sans">
              WHY DID THE AI MAKE THIS PREDICTION?
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Plain-English reasoning derived from real-time network telemetry and causal attributions.
          </p>
        </div>

        {/* Technical toggle button */}
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
            showTechnical
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200"
          }`}
        >
          <span>{showTechnical ? "Hide Technical Explanation" : "View Technical Explanation"}</span>
          {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Target Stage Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">
          WHY <strong className="text-slate-200">{stageInfo.technicalName}</strong> IS CURRENTLY FORECASTED:
        </span>
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${stageInfo.badgeColor}`}>
          {stageInfo.plainEnglishTitle}
        </span>
      </div>

      {/* Plain English Signals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {signalsToRender.slice(0, 4).map((sig, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/30 transition-all flex items-start space-x-3 group"
          >
            <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors font-sans">
                {sig.title}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {sig.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Expandable Technical Explanation Panel */}
      {showTechnical && (
        <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-200">
                Underlying Telemetry Features & Standardized z-Scores
              </span>
            </div>
            <span className="text-[11px] text-cyan-400">
              {explanation?.explainer_type || "Integrated Gradients / TreeSHAP"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono text-xs">
            {Object.entries(state.top_features || {}).map(([feat, val]) => {
              const isAnomalous = Math.abs(val) > 1.5;
              return (
                <div
                  key={feat}
                  className={`p-3 rounded-xl bg-slate-950 border ${
                    isAnomalous
                      ? "border-cyan-500/40 text-cyan-300"
                      : "border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="truncate text-[10px] text-slate-500 font-bold" title={feat}>
                    {feat}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-bold text-sm">
                      {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        val > 0 ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {val > 0 ? "HIGH" : "LOW"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model Natural Language Summary if available */}
          {explanation?.natural_language_summary && explanation.natural_language_summary.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider font-bold">
                Model Explanation Attribution Summary:
              </div>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                {explanation.natural_language_summary.map((summaryText, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-cyan-400">&bull;</span>
                    <span>{summaryText}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
