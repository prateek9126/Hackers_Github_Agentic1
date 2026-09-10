import React from "react";
import { Eye, Clock, HelpCircle, Sliders, ArrowDown, Sparkles, Shield, Compass } from "lucide-react";

export const WhyDifferentCard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* SECTION 5: WHAT'S DIFFERENT? */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-cyber-950/90 to-cyber-950/95 shadow-2xl">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Paradigm Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight font-sans">
            WHAT'S DIFFERENT?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
            How our temporal forecasting architecture compares to standard security monitoring workflows.
          </p>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* 1. Traditional Security */}
          <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider">
                  Traditional Security
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  Reactive Flow
                </span>
              </div>

              {/* Steps Flow */}
              <div className="mt-5 space-y-3 font-sans">
                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-200">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Step 1</div>
                  <div className="font-semibold text-slate-100 mt-0.5">"Something suspicious happened."</div>
                </div>

                <div className="flex justify-center text-slate-600">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-200">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Step 2</div>
                  <div className="font-semibold text-slate-100 mt-0.5">Alert Generated</div>
                </div>

                <div className="flex justify-center text-slate-600">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-200">
                  <div className="text-[10px] uppercase font-mono text-slate-500">Step 3</div>
                  <div className="font-semibold text-slate-100 mt-0.5">Human Investigates</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <span className="text-xs font-mono font-bold text-slate-400">
                Detect &rarr; Alert &rarr; Respond
              </span>
            </div>
          </div>

          {/* 2. Our Approach */}
          <div className="p-6 rounded-xl bg-gradient-to-b from-cyan-950/30 to-purple-950/20 border border-cyan-500/40 flex flex-col justify-between space-y-5 shadow-lg shadow-cyan-950/30">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
                <div className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider">
                  Our Approach
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Predictive Flow
                </span>
              </div>

              {/* Steps Flow */}
              <div className="mt-5 space-y-3 font-sans">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-xs text-slate-200">
                  <div className="text-[10px] uppercase font-mono text-cyan-400">Step 1</div>
                  <div className="font-semibold text-slate-100 mt-0.5">"Something suspicious is happening."</div>
                </div>

                <div className="flex justify-center text-cyan-400">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-purple-500/30 text-xs text-slate-200">
                  <div className="text-[10px] uppercase font-mono text-purple-400">Step 2</div>
                  <div className="font-semibold text-slate-100 mt-0.5">AI Studies Sequence of Behavior</div>
                </div>

                <div className="flex justify-center text-purple-400">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-emerald-500/30 text-xs text-slate-200">
                  <div className="text-[10px] uppercase font-mono text-emerald-400">Step 3 & 4</div>
                  <div className="font-semibold text-slate-100 mt-0.5">"Here's what may happen next." &bull; Defender acts earlier</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-500/30 text-center">
              <span className="text-xs font-mono font-bold text-cyan-300">
                Detect &rarr; Forecast &rarr; Act
              </span>
            </div>
          </div>
        </div>

        {/* Mandatory Hackathon Clarification Statement */}
        <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed text-center max-w-4xl mx-auto">
          <p className="italic">
            "Traditional monitoring is primarily focused on collecting events, detecting suspicious activity, and generating alerts. Our project adds an explicit temporal forecasting layer that estimates likely future attack progression."
          </p>
        </div>
      </div>

      {/* SECTION 6: WHAT DOES OUR AI ADD? */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-purple-500/30 bg-gradient-to-b from-slate-900/90 to-cyber-950/90 shadow-xl">
        <div className="pb-4 border-b border-slate-800/80 mb-6">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg sm:text-xl font-black text-slate-100 uppercase tracking-tight font-sans">
              WHAT DOES OUR AI ADD?
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Four key capabilities engineered to provide actionable cyber advantage.
          </p>
        </div>

        {/* 4 Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Benefit 1 */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              1. SEE AHEAD
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Predict possible next attack stages before they execute.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/40 transition-all space-y-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              2. GET MORE WARNING TIME
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Know about potential progression before it happens.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-purple-500/40 transition-all space-y-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              3. UNDERSTAND WHY
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              See which network behaviors influenced the prediction.
            </p>
          </div>

          {/* Benefit 4 */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/40 transition-all space-y-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              4. TEST A RESPONSE
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Simulate a defense and see how the predicted future changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
