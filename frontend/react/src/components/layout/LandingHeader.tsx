import React, { useState, useEffect } from "react";
import { Menu, X, ArrowRight, Activity } from "lucide-react";

interface LandingHeaderProps {
  onLaunchPlatform: () => void;
  onNavigateSection: (sectionId: "about" | "how-it-works") => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onLaunchPlatform,
  onNavigateSection,
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

  const handleNavClick = (sectionId: "about" | "how-it-works") => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId);
  };

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 w-full pointer-events-none">
      <div
        className={`max-w-5xl mx-auto rounded-2xl px-6 py-3 transition-all duration-300 pointer-events-auto flex items-center justify-between border ${
          isScrolled
            ? "bg-cyber-950/85 backdrop-blur-xl border-cyan-500/20 shadow-2xl shadow-black/60 py-3"
            : "bg-cyber-950/60 backdrop-blur-lg border-white/10 shadow-lg shadow-black/30 py-3.5"
        }`}
        style={{ minHeight: "64px" }}
      >
        {/* Left Side: Clean Logo & Subtitle */}
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center space-x-3 text-left group focus:outline-none"
          aria-label="Scroll to top of Rakshak homepage"
        >
          <div>
            <div className="text-lg font-black tracking-wider text-slate-100 font-sans group-hover:text-cyan-400 transition-colors">
              RAKSHAK
            </div>
            <p className="text-[11px] text-slate-400 font-sans tracking-tight font-normal">
              Predictive Cyber Defense
            </p>
          </div>
        </button>

        {/* Right Side: ONLY About, How It Works, and Launch Platform */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-sans">
          <button
            onClick={() => handleNavClick("about")}
            className="text-slate-300 hover:text-white transition-colors font-medium tracking-wide"
          >
            About
          </button>

          <button
            onClick={() => handleNavClick("how-it-works")}
            className="text-slate-300 hover:text-white transition-colors font-medium tracking-wide"
          >
            How It Works
          </button>

          {/* Premium CTA Button */}
          <button
            onClick={onLaunchPlatform}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-sans tracking-wide"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center space-x-2 md:hidden">
          <button
            onClick={onLaunchPlatform}
            className="bg-cyan-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs"
          >
            Launch
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden max-w-5xl mx-auto mt-2 p-4 rounded-2xl bg-cyber-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl pointer-events-auto space-y-3 animate-fadeIn text-sm font-sans">
          <button
            onClick={() => handleNavClick("about")}
            className="w-full text-left p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 transition-colors"
          >
            About
          </button>

          <button
            onClick={() => handleNavClick("how-it-works")}
            className="w-full text-left p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 transition-colors"
          >
            How It Works
          </button>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchPlatform();
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold flex items-center justify-center space-x-2 text-xs"
            >
              <Activity className="w-4 h-4" />
              <span>Launch Platform</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
