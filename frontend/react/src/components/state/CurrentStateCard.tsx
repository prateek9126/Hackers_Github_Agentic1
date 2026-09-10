import React from "react";
import { Eye, Network, HardDrive, Layers, Clock, HelpCircle, ShieldAlert, Activity } from "lucide-react";
import { CurrentStateResponse } from "../../types/api";
import { getStageInfo, CYBER_TOOLTIPS } from "../../utils/taxonomy";

interface CurrentStateCardProps {
  state: CurrentStateResponse;
  onOpenAdvanced?: () => void;
}

export const CurrentStateCard: React.FC<CurrentStateCardProps> = ({ state, onOpenAdvanced }) => {
  const stageInfo = getStageInfo(state.ground_truth_stage);
  const isAttack = stageInfo.severity !== "BENIGN";

  return (
    <div className="cyber-card rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-cyber-950/90 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: stageInfo.accentColor }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: stageInfo.accentColor }}
              />
              <span
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ backgroundColor: stageInfo.accentColor }}
              />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight font-sans">
              WHAT'S HAPPENING RIGHT NOW?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            The AI is analyzing the network activity happening at this moment.
          </p>
        </div>

        {/* Accessible concept label with tooltip */}
        <div className="flex items-center space-x-2">
          <div
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 group relative cursor-help"
            title={CYBER_TOOLTIPS.networkState}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">CURRENT NETWORK BEHAVIOR</span>
            <HelpCircle className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            
            {/* Tooltip Popup */}
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-64 p-2.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-[11px] text-slate-300 font-sans shadow-2xl">
              {CYBER_TOOLTIPS.networkState}
            </div>
          </div>
        </div>
      </div>

      {/* Main Activity Banner */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: What is currently detected */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span>{isAttack ? "Currently Detected Activity" : "Current Activity"}</span>
            <span className="text-[10px] text-slate-500">Stage #{state.stage_id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="text-xs text-slate-400 font-mono">Technical name:</span>
            <span className={`text-sm font-mono font-black px-2.5 py-0.5 rounded border tracking-wider ${stageInfo.badgeColor}`}>
              {state.ground_truth_stage}
            </span>
          </div>

          <div className="pt-1">
            <div className="text-xs text-slate-400 font-mono">Plain English:</div>
            <div className="text-base font-bold text-slate-100 mt-0.5">
              "{stageInfo.plainEnglishTitle}"
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {stageInfo.plainEnglishDescription}
            </p>
          </div>
        </div>

        {/* Right: Network Activity Metrics with Plain Labels & Tooltips */}
        <div className="lg:col-span-6 space-y-2">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between px-1">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Network Activity</span>
            <span className="text-[11px] text-slate-500 font-mono">Window #{state.window_index} (&Delta;t = {state.duration_sec}s)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Metric 1: Connections */}
            <div
              className="group relative p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all cursor-help"
              title={CYBER_TOOLTIPS.connections}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Network className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Connections</span>
                </span>
                <HelpCircle className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="mt-1.5 text-base sm:text-lg font-black font-mono text-slate-100">
                {state.active_connections} <span className="text-xs font-normal text-slate-400">active</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Active sessions
              </div>

              {/* Tooltip */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30 w-48 p-2 rounded-lg bg-slate-900 border border-cyan-500/40 text-[10px] text-slate-200 shadow-xl">
                {CYBER_TOOLTIPS.connections}
              </div>
            </div>

            {/* Metric 2: Packets */}
            <div
              className="group relative p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 transition-all cursor-help"
              title={CYBER_TOOLTIPS.packets}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Packets</span>
                </span>
                <HelpCircle className="w-3 h-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
              </div>
              <div className="mt-1.5 text-base sm:text-lg font-black font-mono text-slate-100">
                {state.total_packets.toLocaleString()} <span className="text-xs font-normal text-slate-400">analyzed</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Network packets
              </div>

              {/* Tooltip */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30 w-48 p-2 rounded-lg bg-slate-900 border border-purple-500/40 text-[10px] text-slate-200 shadow-xl">
                {CYBER_TOOLTIPS.packets}
              </div>
            </div>

            {/* Metric 3: Bytes */}
            <div
              className="group relative p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-help"
              title={CYBER_TOOLTIPS.bytes}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bytes</span>
                </span>
                <HelpCircle className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="mt-1.5 text-base sm:text-lg font-black font-mono text-slate-100">
                {(state.total_bytes / 1024).toFixed(1)} <span className="text-xs font-normal text-slate-400">KB observed</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Data volume
              </div>

              {/* Tooltip */}
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-30 w-48 p-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-[10px] text-slate-200 shadow-xl">
                {CYBER_TOOLTIPS.bytes}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
