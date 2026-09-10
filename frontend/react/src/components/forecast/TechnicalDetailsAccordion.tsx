import React, { useState } from "react";
import { ChevronDown, ChevronUp, Cpu, Database, Layers, ShieldAlert, Code2, Network, HelpCircle, Activity } from "lucide-react";
import { CurrentStateResponse, ForecastResponse, MitreMappingResponse, ExplanationResponse } from "../../types/api";

interface TechnicalDetailsAccordionProps {
  currentState: CurrentStateResponse;
  forecast: ForecastResponse;
  mitre?: MitreMappingResponse | null;
  explanation?: ExplanationResponse | null;
}

export const TechnicalDetailsAccordion: React.FC<TechnicalDetailsAccordionProps> = ({
  currentState,
  forecast,
  mitre,
  explanation,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="cyber-card rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl overflow-hidden">
      {/* Accordion Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-900/50 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold font-mono text-slate-200 uppercase tracking-wider">
                ADVANCED TECHNICAL DETAILS
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                Architectural Inspection
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Mathematical state formulations, PyTorch LSTM parameters, candidate distributions, and MITRE ATT&CK telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-purple-400">
          <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Content (Section 9 Requirements) */}
      {isExpanded && (
        <div className="p-6 border-t border-slate-800 space-y-6 font-mono text-xs animate-fadeIn bg-slate-950">
          {/* Row 1: Formal State & Sequence Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Current State S(t) */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-slate-500 text-[10px] uppercase font-bold">
                Current Network State Vector
              </div>
              <div className="text-lg font-bold text-cyan-300">
                S(t) &bull; Window #{currentState.window_index}
              </div>
              <div className="text-slate-400 text-[11px] space-y-1">
                <div>&bull; Observed Stage: <strong className="text-slate-200">{currentState.ground_truth_stage}</strong> (ID: #{currentState.stage_id})</div>
                <div>&bull; Window Duration: <strong className="text-slate-200">&Delta;t = {currentState.duration_sec}s</strong></div>
                <div>&bull; Active Sockets: <strong className="text-slate-200">{currentState.active_connections}</strong></div>
              </div>
            </div>

            {/* 2. Temporal Sequence */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-slate-500 text-[10px] uppercase font-bold">
                Temporal Sequence Context
              </div>
              <div className="text-base font-bold text-purple-300">
                [S(t-3), S(t-2), S(t-1), S(t)]
              </div>
              <div className="text-slate-400 text-[11px] space-y-1">
                <div>&bull; Memory Window Length: <strong className="text-slate-200">W = 4 Steps</strong> (80s prior)</div>
                <div>&bull; Feature Dimensions: <strong className="text-slate-200">23 Flow + Packet Features</strong></div>
                <div>&bull; Sampling: <strong className="text-slate-200">Fixed 20.0s time bins</strong></div>
              </div>
            </div>

            {/* 3. AI Model Engine & Horizon */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="text-slate-500 text-[10px] uppercase font-bold">
                Forecasting Engine Architecture
              </div>
              <div className="text-lg font-bold text-emerald-300">
                PyTorch LSTM &bull; K = {forecast.forecast_horizon || 5}
              </div>
              <div className="text-slate-400 text-[11px] space-y-1">
                <div>&bull; Model: <strong className="text-slate-200">{forecast.model} Network</strong></div>
                <div>&bull; Output: <strong className="text-slate-200">P(S(t+1) ... S(t+K))</strong></div>
                <div>&bull; Confidence Score: <strong className="text-slate-200">{Math.round((forecast.forecast[0]?.confidence || 0.8) * 100)}%</strong></div>
              </div>
            </div>
          </div>

          {/* Row 2: Complete Candidate Distributions Table for S(t+1) */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-slate-200 uppercase text-xs">
                  Immediate Next Step S(t+1) Candidate Distributions
                </span>
              </div>
              <span className="text-cyan-400 text-[11px]">&Delta;t = 20s lead time</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Object.entries(forecast.next_stage_probabilities || {}).map(([stage, prob]) => {
                const pct = Math.round(prob * 100);
                const isSelected = forecast.forecast[0]?.stage.toUpperCase() === stage.toUpperCase();

                return (
                  <div
                    key={stage}
                    className={`p-2.5 rounded-lg border ${
                      isSelected
                        ? "bg-purple-950/40 border-purple-500/60 text-purple-200"
                        : "bg-slate-950/80 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="truncate font-bold" title={stage}>{stage}</span>
                      <span className="text-slate-200 font-black">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full ${isSelected ? "bg-purple-400" : "bg-cyan-500/70"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: MITRE ATT&CK Mapping Evidence */}
          {mitre && mitre.techniques && mitre.techniques.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-slate-200 uppercase text-xs">
                    MITRE ATT&CK Enterprise Mapping
                  </span>
                </div>
                <span className="text-slate-500 text-[11px]">{mitre.total_techniques} Techniques Mapped</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {mitre.techniques.slice(0, 6).map((tech) => (
                  <div key={tech.technique_id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-rose-400">{tech.technique_id}</span>
                      <span className="text-slate-500">{tech.status}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-200 truncate">{tech.technique_name}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Tactic: {tech.tactic_name} ({tech.tactic_id})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
