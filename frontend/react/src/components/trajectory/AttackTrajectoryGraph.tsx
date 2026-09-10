import React, { useState } from "react";
import { GitCommit, ArrowRight, ShieldAlert, CheckCircle, Clock, Zap, Info } from "lucide-react";
import { TrajectoryResponse, TrajectoryNode } from "../../types/api";

interface AttackTrajectoryGraphProps {
  trajectory: TrajectoryResponse;
}

export const AttackTrajectoryGraph: React.FC<AttackTrajectoryGraphProps> = ({ trajectory }) => {
  const [selectedNode, setSelectedNode] = useState<TrajectoryNode | null>(
    trajectory.nodes.length > 0 ? trajectory.nodes[0] : null
  );

  const getNodeColor = (stage: string, isObserved: boolean) => {
    if (isObserved) {
      return {
        border: "border-cyan-400 ring-2 ring-cyan-400/40",
        bg: "bg-cyan-950/80",
        text: "text-cyan-300",
        badge: "bg-cyan-500 text-slate-950",
      };
    }
    switch (stage.toUpperCase()) {
      case "SCANNING":
        return {
          border: "border-purple-500",
          bg: "bg-purple-950/60",
          text: "text-purple-300",
          badge: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
        };
      case "EXPLOITATION":
      case "INITIAL_ACCESS":
        return {
          border: "border-amber-500",
          bg: "bg-amber-950/60",
          text: "text-amber-300",
          badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
        };
      case "CREDENTIAL_ACCESS":
      case "LATERAL_MOVEMENT":
        return {
          border: "border-orange-500",
          bg: "bg-orange-950/60",
          text: "text-orange-300",
          badge: "bg-orange-500/20 text-orange-300 border border-orange-500/40",
        };
      case "COMMAND_AND_CONTROL":
      case "EXFILTRATION":
      case "IMPACT_DOS":
        return {
          border: "border-rose-500 ring-2 ring-rose-500/40",
          bg: "bg-rose-950/80",
          text: "text-rose-300",
          badge: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
        };
      default:
        return {
          border: "border-slate-700",
          bg: "bg-slate-900/60",
          text: "text-slate-300",
          badge: "bg-slate-800 text-slate-300",
        };
    }
  };

  return (
    <div className="cyber-card rounded-xl p-5 border border-cyan-900/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
            Attack Trajectory Directed Graph (Multi-Step Kill Chain)
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="flex items-center space-x-1 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Observed (Current)</span>
          </span>
          <span className="flex items-center space-x-1 text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Forecasted (Future)</span>
          </span>
        </div>
      </div>

      {/* Trajectory Graph Pipeline */}
      <div className="mt-6 overflow-x-auto pb-4 scrollbar-none">
        <div className="flex items-center justify-start min-w-[750px] px-2 py-4">
          {trajectory.nodes.map((node, index) => {
            const isObserved = node.state_type === "OBSERVED";
            const colors = getNodeColor(node.stage, isObserved);
            const edge = trajectory.edges.find((e) => e.source_node_id === node.node_id);
            const isSelected = selectedNode?.node_id === node.node_id;

            return (
              <React.Fragment key={node.node_id}>
                {/* Node Box */}
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`relative cursor-pointer rounded-xl p-3.5 border transition-all duration-300 min-w-[140px] max-w-[160px] ${
                    colors.bg
                  } ${colors.border} ${
                    isSelected ? "ring-2 ring-cyan-400 scale-105 shadow-xl shadow-cyan-950" : "hover:scale-102"
                  }`}
                >
                  {/* Status Pill */}
                  <div className="flex items-center justify-between text-[10px] font-mono pb-1 border-b border-slate-800/80">
                    <span className="font-bold text-slate-400">
                      {isObserved ? "Step 0" : `Step +${node.step}`}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${colors.badge}`}>
                      {node.state_type}
                    </span>
                  </div>

                  {/* Stage Label */}
                  <div className={`mt-2 font-mono font-bold text-xs truncate ${colors.text}`} title={node.stage}>
                    {node.stage}
                  </div>

                  {/* Confidence / Probability Metric */}
                  <div className="mt-2 flex items-baseline justify-between font-mono text-xs">
                    <span className="text-[10px] text-slate-400">Conf:</span>
                    <span className="font-extrabold text-slate-100">
                      {Math.round(node.probability * 100)}%
                    </span>
                  </div>

                  {/* Lead Time Badge */}
                  <div className="mt-1 flex items-center space-x-1 text-[10px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{isObserved ? "Now (t=0)" : `+${node.step * 20}s lead`}</span>
                  </div>
                </div>

                {/* Transition Directed Edge with Probability Badge */}
                {edge && (
                  <div className="flex flex-col items-center px-2 relative group">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-800 shadow-sm mb-1">
                      P = {Math.round(edge.transition_probability * 100)}%
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500" />
                      <ArrowRight className="w-4 h-4 text-purple-400 -ml-1 animate-pulse" />
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 mt-1">
                      +20s
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-3 p-3 rounded-lg bg-cyber-900/90 border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300 pb-1 border-b border-slate-800">
            <span className="flex items-center space-x-1.5 font-bold text-cyan-400">
              <Info className="w-3.5 h-3.5" />
              <span>Node Inspector: {selectedNode.node_id} &bull; {selectedNode.stage}</span>
            </span>
            <span className="text-slate-400">
              State Type: <strong className="text-slate-200">{selectedNode.state_type}</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-slate-400">
            <div>
              <span>Progression Step:</span>
              <div className="text-slate-200 font-bold">t + {selectedNode.step} (+{selectedNode.step * 20}s)</div>
            </div>
            <div>
              <span>Model Confidence:</span>
              <div className="text-slate-200 font-bold">{Math.round(selectedNode.probability * 100)}%</div>
            </div>
            <div>
              <span>Stage Index:</span>
              <div className="text-slate-200 font-bold">#{selectedNode.stage_id}</div>
            </div>
            <div>
              <span>Causal Assurance:</span>
              <div className="text-emerald-400 font-bold">No Future Leakage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
