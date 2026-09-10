import React, { useState } from "react";
import { GitBranch, Shield, ArrowRight, Info, AlertTriangle, Layers, CheckCircle2 } from "lucide-react";
import { AttackTrajectoryGraph } from "../components/trajectory/AttackTrajectoryGraph";
import { TrajectoryResponse, TrajectoryNode } from "../types/api";

interface TrajectoryPageProps {
  trajectory: TrajectoryResponse | null;
}

export const TrajectoryPage: React.FC<TrajectoryPageProps> = ({ trajectory }) => {
  const [selectedNode, setSelectedNode] = useState<TrajectoryNode | null>(null);

  const nodes = trajectory?.nodes || [];
  const edges = trajectory?.edges || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-950/80 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>STATE-TRANSITION MARKOV GRAPH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight font-sans">
            Attack Trajectory Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
            Chronological Directed Attack Graph &bull; Discrete State Transitions &bull; Cumulative Risk Path
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono bg-cyber-900/80 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">OBSERVED</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">PREDICTED</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">BENIGN / MITIGATED</span>
          </div>
        </div>
      </div>

      {/* Main Trajectory Visualizer */}
      <div className="space-y-6">
        {trajectory ? (
          <AttackTrajectoryGraph trajectory={trajectory} />
        ) : (
          <div className="cyber-card p-12 text-center text-slate-400 font-mono text-sm">
            [Loading attack progression trajectory graph...]
          </div>
        )}
      </div>

      {/* Interactive Node Inspector & Explanatory Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Node Explorer (7 cols) */}
        <div className="lg:col-span-7 cyber-card p-6 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Trajectory Node Inspector</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {nodes.length} Stages Projected
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Select any future timestep node to inspect transition probabilities and expected operational lead times:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {nodes.map((node) => {
              const isSelected = selectedNode?.node_id === node.node_id;
              const isObserved = node.state_type === "OBSERVED";
              return (
                <button
                  key={node.node_id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-md shadow-cyan-500/20"
                      : "border-slate-800 bg-cyber-950/80 hover:bg-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
                    <span>{node.timestamp}</span>
                    <span className={isObserved ? "text-cyan-400 font-bold" : "text-amber-400"}>
                      {node.state_type}
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate mt-1 text-slate-100">
                    {node.stage}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                    P = {(node.probability * 100).toFixed(0)}%
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Node Details */}
          {selectedNode ? (
            <div className="p-4 rounded-xl bg-cyber-950 border border-cyan-500/30 space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold">{selectedNode.stage} ({selectedNode.timestamp})</span>
                <span className="text-slate-400">Confidence: {(selectedNode.confidence * 100).toFixed(1)}%</span>
              </div>
              <p className="text-xs text-slate-300">
                Projected state transition for step {selectedNode.step}. Ingested purely under causal constraints without peeking at future packet windows.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-cyber-950 border border-slate-800/80 text-xs font-mono text-slate-500 text-center">
              Click a node above to inspect detailed confidence scores and stage metadata.
            </div>
          )}
        </div>

        {/* Intuition Guide for Visitors & Judges (5 cols) */}
        <div className="lg:col-span-5 cyber-card p-6 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Info className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              What Is an Attack Trajectory?
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-400 leading-relaxed font-sans">
            <p>
              In traditional cybersecurity, an alert is a static snapshot: <em className="text-slate-300">&ldquo;Host X scanned Port 445.&rdquo;</em>
            </p>
            <p>
              An <strong>Attack Trajectory</strong> is a forward-looking movie: It maps the path an attacker is currently navigating through the kill chain.
            </p>
            <p>
              If an attacker is in <span className="text-cyan-300 font-bold">Scanning</span>, the trajectory calculates whether they are likely to escalate into <span className="text-amber-300 font-bold">Exploitation</span> (71%) or attempt <span className="text-purple-300 font-bold">Credential Access</span> (54%).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <strong>Key Benefit:</strong> Defenders can position countermeasures along the projected path <em>before</em> the adversary reaches the destination.
          </div>
        </div>
      </div>
    </div>
  );
};
