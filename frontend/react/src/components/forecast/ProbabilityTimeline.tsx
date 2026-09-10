import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, Clock, CheckCircle2, ShieldAlert, BarChart2, Zap, ArrowDown, ChevronRight } from "lucide-react";
import { ForecastResponse, LeadTimeEvaluation } from "../../types/api";
import { getStageInfo } from "../../utils/taxonomy";

interface ProbabilityTimelineProps {
  forecast: ForecastResponse;
  currentStage?: string;
  evaluations?: LeadTimeEvaluation[];
}

export const ProbabilityTimeline: React.FC<ProbabilityTimelineProps> = ({
  forecast,
  currentStage,
  evaluations = [],
}) => {
  const [chartView, setChartView] = useState<"visual-path" | "probability-curve">("visual-path");
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);

  const currentStageName = currentStage || forecast.current_stage || "BENIGN";
  const nowInfo = getStageInfo(currentStageName);

  // Check which predicted stages have been verified later by evaluations
  const confirmedStages = new Set(
    evaluations.filter((e) => e.is_correct).map((e) => e.predicted_stage.toUpperCase())
  );

  // Unified sequence: NOW node (index 0) + 5 forecast horizons (indices 1..5)
  const timelineSteps = [
    {
      index: 0,
      isNow: true,
      stepNum: 0,
      label: "NOW",
      timing: "Current Moment",
      offset: "+0s",
      stageName: nowInfo.technicalName,
      title: nowInfo.plainEnglishTitle,
      description: nowInfo.plainEnglishDescription,
      color: nowInfo.accentColor,
      severity: nowInfo.severity,
      badgeColor: nowInfo.badgeColor,
      isConfirmed: false,
      probabilityPct: 100,
      confidencePct: 100,
    },
    ...forecast.forecast.map((step, idx) => {
      const stepInfo = getStageInfo(step.stage);
      const isConfirmed = confirmedStages.has(step.stage.toUpperCase());
      return {
        index: idx + 1,
        isNow: false,
        stepNum: step.step,
        label: `t+${step.step}`,
        timing: `Horizon +${step.step * 20}s (Step t+${step.step})`,
        offset: `+${step.step * 20}s`,
        stageName: stepInfo.technicalName,
        title: stepInfo.plainEnglishTitle,
        description: stepInfo.shortDescription,
        color: stepInfo.accentColor,
        severity: stepInfo.severity,
        badgeColor: stepInfo.badgeColor,
        isConfirmed,
        probabilityPct: Math.round(step.probability * 100),
        confidencePct: Math.round(step.confidence * 100),
      };
    }),
  ];

  // Dynamic multi-stop gradient based on the actual attack progression colors
  // As attack escalates (e.g. Benign/Recon -> Exploitation -> Exfiltration), the line shifts colors dynamically!
  const gradientStops = timelineSteps.map((s, idx) => {
    const pct = Math.round((idx / (timelineSteps.length - 1)) * 100);
    return `${s.color} ${pct}%`;
  });
  const dynamicLineGradient = `linear-gradient(to bottom, ${gradientStops.join(", ")})`;

  // Format Recharts data across horizons t+1 .. t+5
  const chartData = forecast.forecast.map((step) => {
    return {
      horizon: `t+${step.step} (+${step.step * 20}s)`,
      Stage: step.stage,
      Probability: Math.round(step.probability * 100),
      Confidence: Math.round(step.confidence * 100),
    };
  });

  return (
    <div className="cyber-card rounded-2xl p-6 sm:p-7 border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 via-cyber-950/95 to-cyber-950/95 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight font-sans">
              SEEING THE ATTACK BEFORE IT PROGRESSES
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            The AI estimates the likelihood and threat severity of different attack stages as time advances.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setChartView("visual-path")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                chartView === "visual-path"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Dynamic Attack Line</span>
            </button>
            <button
              onClick={() => setChartView("probability-curve")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                chartView === "probability-curve"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Probability Curve</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Timeline Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-slate-950/70 px-4 py-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-2 text-slate-400 font-bold">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>PROGRESSION LINE STATUS:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            <span className="text-cyan-300 font-medium">● Observed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-purple-400 bg-transparent inline-block shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            <span className="text-purple-300 font-medium">○ Predicted</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">✓ Confirmed later</span>
          </div>
          <div className="hidden md:flex items-center space-x-1 text-slate-500 text-[11px] pl-2 border-l border-slate-800">
            <span>Color shifts with threat escalation</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: DYNAMIC PROGRESSIVE ATTACK TIMELINE LINE */}
      {chartView === "visual-path" && (
        <div className="p-4 sm:p-7 rounded-2xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
          {/* Ambient threat glow matching the current peak step */}
          <div
            className="absolute top-1/3 left-6 w-48 h-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-700"
            style={{
              backgroundColor:
                hoveredStepIndex !== null
                  ? timelineSteps[hoveredStepIndex]?.color
                  : timelineSteps[1]?.color || "#00f0ff",
            }}
          />

          {/* Timeline Container with Spine and Steps */}
          <div className="relative pl-12 sm:pl-16 space-y-7">
            {/* ==================================================
                1. CONTINUOUS PROGRESSIVE GLOWING SPINE
                Changes color dynamically along the attack path
               ================================================== */}
            <div className="absolute left-[20px] sm:left-[26px] top-6 bottom-6 w-1 sm:w-1.5 rounded-full overflow-hidden pointer-events-none z-0">
              {/* Dynamic Gradient Track */}
              <div
                className="w-full h-full transition-all duration-700"
                style={{
                  background: dynamicLineGradient,
                  boxShadow: `0 0 14px ${timelineSteps[timelineSteps.length - 1]?.color}80, 0 0 6px ${timelineSteps[0]?.color}80`,
                }}
              />
              {/* Traveling Cyber Laser Pulse (Sweeps down the line) */}
              <div className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-white to-transparent opacity-80 animate-laser-pulse blur-[0.5px]" />
            </div>

            {/* ==================================================
                2. STEP NODES & CARDS
               ================================================== */}
            {timelineSteps.map((step, idx) => {
              const isHovered = hoveredStepIndex === idx;
              const isLast = idx === timelineSteps.length - 1;
              const nextStep = !isLast ? timelineSteps[idx + 1] : null;

              return (
                <div
                  key={step.label}
                  className="relative group transition-all duration-300"
                  onMouseEnter={() => setHoveredStepIndex(idx)}
                  onMouseLeave={() => setHoveredStepIndex(null)}
                >
                  {/* ==============================================
                      HIGH-TECH CYBER NODE (On the spine)
                     ============================================== */}
                  <div
                    className="absolute -left-12 sm:-left-16 top-3 flex items-center justify-center z-10 cursor-pointer"
                    style={{ width: "42px", height: "42px" }}
                  >
                    {/* Animated Ripple / Radar Ping Aura */}
                    <span
                      className={`absolute w-full h-full rounded-full transition-all duration-300 ${
                        step.isNow || isHovered ? "animate-cyber-ping opacity-60" : "opacity-0 group-hover:opacity-40"
                      }`}
                      style={{ backgroundColor: step.color }}
                    />

                    {/* Outer Glowing Cyber Ring */}
                    <div
                      className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950 border-2 flex items-center justify-center transition-all duration-300 shadow-lg ${
                        isHovered ? "scale-110" : ""
                      }`}
                      style={{
                        borderColor: step.color,
                        boxShadow: isHovered
                          ? `0 0 20px ${step.color}, 0 0 10px ${step.color}`
                          : `0 0 10px ${step.color}60`,
                      }}
                    >
                      {step.isConfirmed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                      ) : step.isNow ? (
                        /* Observed Node: Concentric Radar Center */
                        <div className="relative flex items-center justify-center">
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: step.color }}
                          />
                          <span
                            className="absolute w-5 h-5 rounded-full border border-dashed animate-spin"
                            style={{ borderColor: step.color, animationDuration: "6s" }}
                          />
                        </div>
                      ) : (
                        /* Forecast Horizon Node: Step number / micro badge */
                        <span
                          className="font-mono text-[11px] font-black"
                          style={{ color: step.color }}
                        >
                          t+{step.stepNum}
                        </span>
                      )}
                    </div>

                    {/* Branch Wire: Bridges the node into the card */}
                    <div
                      className="absolute left-[36px] sm:left-[40px] top-[20px] h-[2px] transition-all duration-300 pointer-events-none"
                      style={{
                        width: "16px",
                        background: `linear-gradient(to right, ${step.color}, ${step.color}60)`,
                        boxShadow: isHovered ? `0 0 8px ${step.color}` : "none",
                        opacity: isHovered ? 1 : 0.7,
                      }}
                    />
                  </div>

                  {/* ==============================================
                      EVENT PROGRESSION CARD
                     ============================================== */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isHovered
                        ? "bg-slate-900 shadow-xl scale-[1.01]"
                        : "bg-slate-900/80 hover:bg-slate-900/95"
                    }`}
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: step.color,
                      borderColor: isHovered ? step.color : `${step.color}30`,
                      boxShadow: isHovered ? `0 4px 20px ${step.color}25` : "0 2px 10px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* Left: Timing, Stage Name & Plain-English Description */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span
                          className="font-bold tracking-wider uppercase text-[11px]"
                          style={{ color: step.color }}
                        >
                          {step.timing}
                        </span>

                        {step.isConfirmed ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            ✓ Confirmed later
                          </span>
                        ) : step.isNow ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                            ● Observed Ground-Truth
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px]">
                            ○ AI Forecasted Step
                          </span>
                        )}

                        <span className="text-slate-500 text-[10px]">&bull;</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Lead: {step.offset}
                        </span>
                      </div>

                      {/* Stage Heading */}
                      <div className="text-base sm:text-lg font-black text-slate-100 font-mono flex items-center space-x-2">
                        <span>{step.stageName}</span>
                        <span className="text-xs font-normal text-slate-400 font-sans">
                          &bull; "{step.title}"
                        </span>
                      </div>

                      {/* Plain-English Attack Guide */}
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {step.description}
                      </p>
                    </div>

                    {/* Right: Likelihood & Confidence Telemetry Capsule */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-3 sm:pt-0 sm:pl-5 min-w-[130px]">
                      <div className="text-left sm:text-right">
                        <div
                          className="text-2xl sm:text-3xl font-black font-mono tracking-tight"
                          style={{ color: step.color }}
                        >
                          {step.probabilityPct}%
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                          Likelihood
                        </div>
                      </div>

                      {!step.isNow && (
                        <div className="text-left sm:text-right sm:mt-2 text-[11px] font-mono text-slate-400">
                          <span className="opacity-70">Conf: </span>
                          <strong className="text-slate-200">{step.confidencePct}%</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transition connector indicator between steps */}
                  {!isLast && nextStep && (
                    <div className="hidden sm:flex items-center space-x-2 pl-4 pt-1 text-[10px] font-mono text-slate-500">
                      <ArrowDown className="w-3 h-3 text-slate-600" />
                      <span>
                        Advancing +20s &rarr; Threat likelihood transitioning to{" "}
                        <strong style={{ color: nextStep.color }}>{nextStep.stageName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Interactive Probability Trajectory Area Chart */}
      {chartView === "probability-curve" && (
        <div className="h-72 w-full font-mono text-xs p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cyanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="horizon" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis stroke="#64748b" unit="%" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1220",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="Probability"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#purpleAreaGradient)"
                strokeWidth={2.5}
                name="Attack Progression Likelihood (%)"
              />
              <Area
                type="monotone"
                dataKey="Confidence"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#cyanAreaGradient)"
                strokeWidth={2}
                name="Model Confidence (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
