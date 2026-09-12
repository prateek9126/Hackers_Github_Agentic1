import React, { useState } from "react";
import {
  ShieldAlert,
  ArrowLeft,
  Cpu,
  Radio,
  PlayCircle,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { PageId } from "./Navbar";

interface PlatformNavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onBackToLanding: () => void;
  isBackendHealthy: boolean;
  mode: "live" | "replay";
  onModeChange: (mode: "live" | "replay") => void;
  scenarioType: string;
}

const PLATFORM_TABS: { id: PageId; label: string }[] = [
  { id: "forecast", label: "Forecast" },
  { id: "trajectory", label: "Trajectory" },
  { id: "explainability", label: "Explainability" },
  { id: "simulation", label: "Simulation" },
  { id: "real-world-defense", label: "Real-World Defense" },
  { id: "results", label: "Results" },
];

export const PlatformNavbar: React.FC<PlatformNavbarProps> = ({
  currentPage,
  onNavigate,
  onBackToLanding,
  isBackendHealthy,
  mode,
  onModeChange,
  scenarioType,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cyber-950/95 backdrop-blur-md border-b border-cyan-900/40 shadow-xl shadow-black/40 py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Platform Logo & Back to Website */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToLanding}
            className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors"
            title="Return to public landing page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Website</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="flex items-center space-x-2">
            <span className="text-sm font-black tracking-wider text-slate-100 font-sans">
              RAKSHAK
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
              PLATFORM
            </span>
          </div>
        </div>

        {/* Center: Application Dashboard Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 font-mono text-xs">
          {PLATFORM_TABS.map((tab) => {
            const isActive = currentPage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "text-cyan-300 font-bold bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Technical Telemetry Status & Mode Toggles */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          {/* Causal Filter Pill */}
          <div
            className="hidden xl:flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 text-slate-400"
            title="Causally isolated inference strictly using past traffic (t <= T_obs)"
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px]">
              t &le; <strong className="text-cyan-300">T_obs</strong>
            </span>
          </div>

          {/* Backend Health Pill */}
          <div
            className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800"
            title={isBackendHealthy ? "FastAPI backend active" : "Using local offline SQLite"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className={`text-[11px] ${isBackendHealthy ? "text-emerald-400" : "text-amber-400"}`}>
              {isBackendHealthy ? "Online" : "Offline"}
            </span>
          </div>

          {/* Live vs Replay Switcher */}
          <div className="hidden sm:flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              onClick={() => onModeChange("live")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] transition-all ${
                mode === "live"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Live</span>
            </button>
            <button
              onClick={() => onModeChange("replay")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] transition-all ${
                mode === "replay"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <PlayCircle className="w-3 h-3" />
              <span>PCAP</span>
            </button>
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
              aria-label="Toggle platform menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-cyber-950/98 border-t border-slate-800 px-4 pt-3 pb-4 space-y-2 mt-2 font-mono text-xs animate-fadeIn">
          <div className="grid grid-cols-2 gap-1.5">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onNavigate(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                  currentPage === tab.id
                    ? "bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onBackToLanding();
              }}
              className="w-full py-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white text-center flex items-center justify-center space-x-2 border border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Platform &amp; Return to Website</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
