import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { RiskTrajectoryResponse } from "../../types/api";

interface RiskTimelineCardProps {
  risk: RiskTrajectoryResponse;
}

export const RiskTimelineCard: React.FC<RiskTimelineCardProps> = ({ risk }) => {
  const chartData = risk.forward_risk_trajectory.map((val, idx) => ({
    step: idx === 0 ? "Current (t0)" : `t+${idx} (+${idx * 20}s)`,
    risk: Number(val.toFixed(2)),
  }));

  const getRiskLevel = (score: number) => {
    if (score >= 7.5) return { label: "CRITICAL RISK", color: "text-rose-400 bg-rose-950/80 border-rose-600" };
    if (score >= 5.0) return { label: "HIGH RISK", color: "text-amber-400 bg-amber-950/80 border-amber-600" };
    if (score >= 2.5) return { label: "MODERATE RISK", color: "text-yellow-400 bg-yellow-950/80 border-yellow-600" };
    return { label: "LOW RISK", color: "text-emerald-400 bg-emerald-950/80 border-emerald-600" };
  };

  const level = getRiskLevel(risk.current_risk);

  return (
    <div className="cyber-card rounded-xl p-5 border border-rose-900/30 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            Cumulative Risk Trajectory Curve
          </h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${level.color}`}>
          {level.label}
        </span>
      </div>

      {/* Current Score Callout */}
      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase">Instantaneous Risk</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">
            {risk.current_risk.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ 10.0</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase">Advance Warning Horizon</span>
          <div className="text-xs text-cyan-400 font-bold mt-0.5 flex items-center justify-end space-x-1">
            <Clock className="w-3 h-3" />
            <span>+100 seconds forward</span>
          </div>
        </div>
      </div>

      {/* Trajectory Line Chart */}
      <div className="h-44 w-full mt-3 text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="step" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis stroke="#64748b" domain={[0, 10]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0b1220",
                borderColor: "#334155",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "11px",
              }}
            />
            <Line
              type="monotone"
              dataKey="risk"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ fill: "#f43f5e", r: 4 }}
              activeDot={{ r: 6, fill: "#00f0ff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
