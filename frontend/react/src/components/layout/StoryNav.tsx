import React from "react";
import { Eye, TrendingUp, HelpCircle, Shield, RefreshCw, ChevronRight } from "lucide-react";

interface StoryNavProps {
  activeStep: "observe" | "forecast" | "explain" | "simulate" | "re-forecast";
  onSelectStep: (step: "observe" | "forecast" | "explain" | "simulate" | "re-forecast") => void;
}

export const StoryNav: React.FC<StoryNavProps> = ({ activeStep, onSelectStep }) => {
  const steps = [
    {
      id: "observe",
      label: "1. OBSERVE",
      desc: "Current Network State S(t)",
      icon: Eye,
      accent: "text-cyan-400 border-cyan-500/40 bg-cyan-950/40",
    },
    {
      id: "forecast",
      label: "2. FORECAST",
      desc: "K-Step Trajectory P(S(t+k))",
      icon: TrendingUp,
      accent: "text-purple-400 border-purple-500/40 bg-purple-950/40",
    },
    {
      id: "explain",
      label: "3. EXPLAIN",
      desc: "Integrated Gradients & SHAP",
      icon: HelpCircle,
      accent: "text-blue-400 border-blue-500/40 bg-blue-950/40",
    },
    {
      id: "simulate",
      label: "4. SIMULATE",
      desc: "What-If Defense Counterfactual",
      icon: Shield,
      accent: "text-amber-400 border-amber-500/40 bg-amber-950/40",
    },
    {
      id: "re-forecast",
      label: "5. RE-FORECAST",
      desc: "Future Risk Reduction Meter",
      icon: RefreshCw,
      accent: "text-emerald-400 border-emerald-500/40 bg-emerald-950/40",
    },
  ] as const;

  return (
    <div className="bg-cyber-900/60 border-y border-cyan-950/60 px-6 py-2">
      <div className="flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStep(step.id)}
                className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border transition-all text-left whitespace-nowrap ${
                  isActive
                    ? `${step.accent} ring-1 ring-cyan-400/50 shadow-lg`
                    : "border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
                <div>
                  <div className="text-xs font-mono font-bold tracking-wider">{step.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono hidden sm:block">{step.desc}</div>
                </div>
              </button>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-700 shrink-0 hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
