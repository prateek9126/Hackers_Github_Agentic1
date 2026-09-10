import React from "react";
import { HelpCircle, ArrowUpRight, ArrowDownRight, Cpu, Layers } from "lucide-react";
import { ExplanationResponse } from "../../types/api";

interface ExplainabilityCardProps {
  explanation: ExplanationResponse;
}

export const ExplainabilityCard: React.FC<ExplainabilityCardProps> = ({ explanation }) => {
  return (
    <div className="cyber-card rounded-xl p-5 border border-blue-900/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
            3. Explain — Feature Attribution & Why Model Predicted Next Stage
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
          <Cpu className="w-3.5 h-3.5" />
          <span>{explanation.explainer_type}</span>
        </div>
      </div>

      {/* Target Stage & Confidence Callout */}
      <div className="mt-4 p-3 rounded-lg bg-blue-950/30 border border-blue-900/50 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-slate-400">Target Predicted Stage: </span>
          <strong className="text-blue-300 text-sm font-bold tracking-wide">
            {explanation.predicted_stage}
          </strong>
        </div>
        <div>
          <span className="text-slate-400">Confidence: </span>
          <strong className="text-slate-100">{Math.round(explanation.confidence * 100)}%</strong>
        </div>
      </div>

      {/* Top Attributing Signals List */}
      <div className="mt-4 space-y-2.5">
        {explanation.top_signals.map((sig, idx) => {
          const increases = sig.direction === "INCREASES_RISK";
          const maxAttr = Math.max(...explanation.top_signals.map((s) => Math.abs(s.attribution_score)), 0.01);
          const barWidth = Math.min(100, Math.round((Math.abs(sig.attribution_score) / maxAttr) * 100));

          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/40 transition-all font-mono text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-200">{sig.feature_name}</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                    {sig.time_window}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      increases
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    }`}
                  >
                    {increases ? (
                      <ArrowUpRight className="w-3 h-3 text-rose-400" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>{increases ? "INCREASES RISK" : "DECREASES RISK"}</span>
                  </span>
                  <span className="text-slate-400">
                    Attr: <strong className="text-slate-200">{sig.attribution_score > 0 ? `+${sig.attribution_score.toFixed(3)}` : sig.attribution_score.toFixed(3)}</strong>
                  </span>
                </div>
              </div>

              {/* Attribution Relative Bar */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${increases ? "bg-blue-500" : "bg-emerald-500"}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Natural Language Sentence */}
              <div className="mt-2 text-[11px] text-slate-400">
                {sig.explanation_text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Natural Language Synthesis */}
      {explanation.natural_language_summary && explanation.natural_language_summary.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono">
          <div className="text-slate-300 font-bold mb-1">Threat Intelligence Summary:</div>
          <ul className="space-y-1 text-slate-400 list-disc list-inside">
            {explanation.natural_language_summary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
