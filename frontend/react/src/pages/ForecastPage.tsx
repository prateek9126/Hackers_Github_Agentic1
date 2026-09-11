import React from "react";
import { Activity, ShieldAlert, Cpu, AlertTriangle, Radio, PlayCircle, UploadCloud, Compass, Sparkles } from "lucide-react";
import { CurrentStateCard } from "../components/state/CurrentStateCard";
import { ForecastCard } from "../components/forecast/ForecastCard";
import { ProbabilityTimeline } from "../components/forecast/ProbabilityTimeline";
import { EarlyWarningCard } from "../components/forecast/EarlyWarningCard";
import { ReplayController } from "../components/replay/ReplayController";
import { LeadTimeScoreboard } from "../components/replay/LeadTimeScoreboard";
import { PageId } from "../components/layout/Navbar";
import {
  CurrentStateResponse,
  ForecastResponse,
  ReplayTimelineResponse,
  LeadTimeEvaluation,
  ExplanationResponse,
  MitreMappingResponse,
} from "../types/api";

interface ForecastPageProps {
  currentState: CurrentStateResponse | null;
  forecast: ForecastResponse | null;
  replayTimeline: ReplayTimelineResponse | null;
  replayStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedScenario: string;
  onScenarioChange: (scenario: string) => void;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onUploadPcap: (file: File, windowDurationSec: number) => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
  onLoadDemoPcap?: (windowDurationSec: number) => Promise<void>;
  isDemoLoading?: boolean;
  leadTimeEvaluations: LeadTimeEvaluation[];
  explanation?: ExplanationResponse | null;
  mitre?: MitreMappingResponse | null;
  onNavigate?: (page: PageId) => void;
}

export const ForecastPage: React.FC<ForecastPageProps> = ({
  currentState,
  forecast,
  replayTimeline,
  replayStep,
  isPlaying,
  playbackSpeed,
  selectedScenario,
  onScenarioChange,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
  onReset,
  onUploadPcap,
  isUploading,
  uploadError,
  onLoadDemoPcap,
  isDemoLoading = false,
  leadTimeEvaluations,
  explanation,
  mitre,
  onNavigate,
}) => {
  const isDemo =
    selectedScenario === "synthetic" ||
    (replayTimeline && replayTimeline.scenario_type === "DEMO/SYNTHETIC");

  // Determine current risk category from forecast
  const topProb = forecast?.forecast?.[0]?.probability || 0.5;
  const riskCategory =
    topProb > 0.75 ? "CRITICAL" : topProb > 0.5 ? "HIGH" : topProb > 0.25 ? "MODERATE" : "LOW";
  const riskColor =
    riskCategory === "CRITICAL"
      ? "text-rose-400 bg-rose-950/80 border-rose-500/50"
      : riskCategory === "HIGH"
      ? "text-amber-400 bg-amber-950/80 border-amber-500/50"
      : "text-blue-400 bg-blue-950/80 border-blue-500/50";

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* ==================================================
          CORE PRODUCT MESSAGE & PAGE HEADER
          "Most security tools tell you what is happening now.
          Our system predicts what could happen next."
         ================================================== */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-cyber-950 to-slate-950 border border-cyan-500/40 shadow-2xl overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>PREDICTIVE NETWORK INTELLIGENCE</span>
              <span className="text-slate-500">&bull;</span>
              <span>K=5 HORIZONS</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-100 tracking-tight font-sans">
              "Most security tools tell you what is happening now.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Our system predicts what could happen next."
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
              Real-time telemetry observation coupled with temporal AI sequence models to anticipate cyber attack progression minutes before critical impact.
            </p>
          </div>

          {/* Current Status Pills */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono self-start md:self-center">
            {isDemo ? (
              <span className="font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Demo / Synthetic
              </span>
            ) : (
              <span className="font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Capture Active
              </span>
            )}

            <div className={`px-3 py-1.5 rounded-xl border ${riskColor}`}>
              <div className="font-bold">
                Risk: {riskCategory} ({(topProb * 10).toFixed(1)}/10)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          PCAP REPLAY & UPLOAD CONTROLLER
         ================================================== */}
      <div className="space-y-4">
        <ReplayController
          timelineData={replayTimeline}
          currentStep={replayStep}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          selectedScenario={selectedScenario}
          onScenarioChange={onScenarioChange}
          onStepChange={onStepChange}
          onTogglePlay={onTogglePlay}
          onSpeedChange={onSpeedChange}
          onReset={onReset}
          onUploadPcap={onUploadPcap}
          isUploading={isUploading}
          uploadError={uploadError}
          onLoadDemoPcap={onLoadDemoPcap}
          isDemoLoading={isDemoLoading}
        />
      </div>

      {/* ==================================================
          SECTION 1 — WHAT'S HAPPENING RIGHT NOW?
         ================================================== */}
      {currentState && <CurrentStateCard state={currentState} />}

      {/* ==================================================
          SECTION 2 — WHAT COULD HAPPEN NEXT? (FORECAST SCORECARD)
         ================================================== */}
      {forecast && (
        <ForecastCard
          forecast={forecast}
          currentStage={currentState?.ground_truth_stage}
        />
      )}

      {/* ==================================================
          FORECAST SCORECARD (Lead-Time Verification)
         ================================================== */}
      {leadTimeEvaluations && leadTimeEvaluations.length > 0 && (
        <LeadTimeScoreboard
          evaluations={leadTimeEvaluations}
          currentStage={currentState?.ground_truth_stage || "BENIGN"}
          currentStep={replayStep}
        />
      )}

      {/* ==================================================
          SECTION 3 — SEEING THE ATTACK BEFORE IT PROGRESSES
         ================================================== */}
      {forecast && (
        <ProbabilityTimeline
          forecast={forecast}
          currentStage={currentState?.ground_truth_stage}
          evaluations={leadTimeEvaluations}
        />
      )}

      {/* ==================================================
          SECTION 4 & SECTION 8: EARLY WARNING & WHAT DOES THIS MATTER
         ================================================== */}
      <EarlyWarningCard
        evaluations={leadTimeEvaluations}
        durationSec={currentState?.duration_sec || 20}
        onExploreDefense={() => onNavigate && onNavigate("simulation")}
      />
    </div>
  );
};
