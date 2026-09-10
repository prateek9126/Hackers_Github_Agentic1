import React from "react";
import { Shield, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { MitreMappingResponse } from "../../types/api";

interface MitreAttackPanelProps {
  mitre: MitreMappingResponse;
}

export const MitreAttackPanel: React.FC<MitreAttackPanelProps> = ({ mitre }) => {
  return (
    <div className="cyber-card rounded-xl p-5 border border-cyan-900/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
            Evidence-Based MITRE ATT&CK Mapping
          </h3>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
          {mitre.total_techniques} Techniques Mapped
        </span>
      </div>

      {/* Techniques List */}
      <div className="mt-4 space-y-3">
        {mitre.techniques.map((tech) => {
          const isObserved = tech.status === "OBSERVED TECHNIQUE";

          return (
            <div
              key={tech.technique_id}
              className={`p-3.5 rounded-lg border font-mono text-xs transition-all ${
                isObserved
                  ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-300"
                  : "bg-purple-950/30 border-purple-500/40 text-purple-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-black text-xs px-2 py-0.5 rounded ${
                      isObserved ? "bg-cyan-500 text-slate-950" : "bg-purple-500 text-slate-950"
                    }`}
                  >
                    {tech.technique_id}
                  </span>
                  <span className="font-bold text-slate-200 text-sm">{tech.technique_name}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isObserved
                        ? "border-cyan-400 text-cyan-300 bg-cyan-950"
                        : "border-purple-400 text-purple-300 bg-purple-950"
                    }`}
                  >
                    {tech.status}
                  </span>
                  <span className="text-slate-400 text-xs">
                    Conf: <strong className="text-slate-200">{Math.round(tech.confidence * 100)}%</strong>
                  </span>
                </div>
              </div>

              {/* Tactic & Stage Context */}
              <div className="mt-2 flex items-center space-x-3 text-[11px] text-slate-400">
                <span>
                  Tactic: <strong className="text-slate-300">{tech.tactic_name}</strong> ({tech.tactic_id})
                </span>
                <span>&bull;</span>
                <span>
                  Attack Stage: <strong className="text-slate-300">{tech.stage_name}</strong>
                </span>
              </div>

              {/* Empirical Telemetry Evidence */}
              <div className="mt-2 pt-2 border-t border-slate-800/60">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Empirical Telemetry Evidence:
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {tech.evidence.map((line, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-cyan-400 mt-0.5">&rsaquo;</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
