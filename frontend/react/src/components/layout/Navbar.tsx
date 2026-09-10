import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Activity,
  Cpu,
  Database,
  Menu,
  X,
  PlayCircle,
  Radio,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export type PageId =
  | "home"
  | "about"
  | "how-it-works"
  | "forecast"
  | "trajectory"
  | "explainability"
  | "simulation"
  | "results";

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isBackendHealthy: boolean;
  mode: "live" | "replay";
  onModeChange: (mode: "live" | "replay") => void;
  scenarioType: string;
}

interface NavItem {
  id: PageId;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "how-it-works", label: "How It Works" },
  { id: "forecast", label: "Forecast", badge: "Live ML" },
  { id: "trajectory", label: "Trajectory" },
  { id: "explainability", label: "Explainability", badge: "SHAP" },
  { id: "simulation", label: "Simulation", badge: "Sandbox" },
  { id: "results", label: "Results", badge: "Metrics" },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  isBackendHealthy,
  mode,
  onModeChange,
  scenarioType,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (id: PageId) => {
    onNavigate(id);
    setMobileMenuOpen(false);
    window.location.hash = id;
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-cyber-950/95 backdrop-blur-md border-b border-cyan-900/40 shadow-xl shadow-black/40 py-2.5"
          : "bg-cyber-950/80 backdrop-blur-sm border-b border-cyan-950/60 py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Project Identity */}
        <button
          onClick={() => handleNavClick("home")}
          className="flex items-center space-x-3 text-left group focus:outline-none"
        >
          <div className="relative p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black tracking-wider text-slate-100 font-sans group-hover:text-cyan-400 transition-colors">
                RAKSHAK
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-800">
                SIH26153
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
              Predictive Network Attack Progression
            </p>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center space-x-1 font-mono text-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? "text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status Pills & Primary Action */}
        <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
          {/* Causal Isolation Pill */}
          <div
            className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 text-slate-400"
            title="Causally isolated inference strictly using t <= T_obs"
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px]">
              t &le; <strong className="text-cyan-300 font-bold">T_obs</strong>
            </span>
          </div>

          {/* Backend Health Pill */}
          <div
            className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800"
            title={isBackendHealthy ? "FastAPI backend running online" : "Using offline local fallback"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span
              className={`text-[11px] ${
                isBackendHealthy ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isBackendHealthy ? "FastAPI Online" : "Local Engine"}
            </span>
          </div>

          {/* Primary CTA: Launch Platform */}
          <button
            onClick={() => handleNavClick("forecast")}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-1.5 rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all text-xs"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Launch Platform</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center space-x-2 xl:hidden">
          <button
            onClick={() => handleNavClick("forecast")}
            className="flex items-center space-x-1 bg-cyan-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
          >
            <span>Live ML</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-cyber-950/98 border-b border-cyan-900/50 px-4 pt-3 pb-6 space-y-2 mt-2 font-mono text-sm animate-fadeIn">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Causal t &le; T_obs</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className={isBackendHealthy ? "text-emerald-400" : "text-amber-400"}>
                {isBackendHealthy ? "FastAPI Online" : "Local Engine"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                  currentPage === item.id
                    ? "bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <span>{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            ))}
          </div>

          <div className="pt-3">
            <button
              onClick={() => handleNavClick("forecast")}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-center flex items-center justify-center space-x-2"
            >
              <Activity className="w-4 h-4" />
              <span>Launch Live Forecast Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
