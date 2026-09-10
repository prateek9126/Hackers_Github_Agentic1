import React, { useState, useEffect, useRef, useCallback } from "react";
import { LandingHeader } from "./components/layout/LandingHeader";
import { PlatformNavbar } from "./components/layout/PlatformNavbar";
import { Footer } from "./components/layout/Footer";
import { PageId } from "./components/layout/Navbar";

// 10 Dedicated Pages
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { ForecastPage } from "./pages/ForecastPage";
import { TrajectoryPage } from "./pages/TrajectoryPage";
import { ExplainabilityPage } from "./pages/ExplainabilityPage";
import { SimulationPage } from "./pages/SimulationPage";
import { ResultsPage } from "./pages/ResultsPage";

import { apiService } from "./services/api";
import {
  CurrentStateResponse,
  ForecastResponse,
  TrajectoryResponse,
  ExplanationResponse,
  MitreMappingResponse,
  SimulateResponse,
  RiskTrajectoryResponse,
  MetricsResponse,
  ReplayTimelineResponse,
  LeadTimeEvaluation,
} from "./types/api";

const VALID_PAGES: PageId[] = [
  "home",
  "about",
  "how-it-works",
  "forecast",
  "trajectory",
  "explainability",
  "simulation",
  "results",
];

export const App: React.FC = () => {
  // Navigation State: 'home' is the public landing page; other routes are platform views
  const [currentPage, setCurrentPage] = useState<PageId>("home");

  // Operational Replay Mode & Backend Health
  const [mode, setMode] = useState<"live" | "replay">("live");
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  // Core Real-Time Telemetry & Forecast States
  const [currentState, setCurrentState] = useState<CurrentStateResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [mitre, setMitre] = useState<MitreMappingResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulateResponse | null>(null);
  const [risk, setRisk] = useState<RiskTrajectoryResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  // Simulation UI State
  const [isSimulating, setIsSimulating] = useState(false);

  // Replay UI States
  const [selectedScenario, setSelectedScenario] = useState("synthetic");
  const [replayTimeline, setReplayTimeline] = useState<ReplayTimelineResponse | null>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [leadTimeEvaluations, setLeadTimeEvaluations] = useState<LeadTimeEvaluation[]>([]);
  const [isUploadingPcap, setIsUploadingPcap] = useState(false);
  const [pcapUploadError, setPcapUploadError] = useState<string | null>(null);

  // Timer Ref for Replay
  const playTimerRef = useRef<number | null>(null);

  // 1. Sync Navigation with URL Hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") as PageId;
      if (VALID_PAGES.includes(hash)) {
        setCurrentPage(hash);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Section smooth scrolling on Landing Page
  const handleLandingSectionScroll = (sectionId: "about" | "how-it-works") => {
    if (currentPage !== "home") {
      setCurrentPage("home");
      window.location.hash = "home";
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 2. Initial Data Fetch from Backend
  const loadInitialData = useCallback(async () => {
    try {
      const health = await apiService.getHealth();
      setIsBackendHealthy(health.status === "healthy");

      const [st, fc, tr, ex, mi, rk, mt, tl] = await Promise.all([
        apiService.getCurrentState(),
        apiService.getForecast(5),
        apiService.getTrajectory(5),
        apiService.getExplanation(4),
        apiService.getMitre(),
        apiService.getRisk(),
        apiService.getMetrics(),
        apiService.getReplayTimeline(selectedScenario),
      ]);

      setCurrentState(st);
      setForecast(fc);
      setTrajectory(tr);
      setExplanation(ex);
      setMitre(mi);
      setRisk(rk);
      setMetrics(mt);
      setReplayTimeline(tl);
    } catch (err) {
      console.error("Initial data load error:", err);
    }
  }, [selectedScenario]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 3. What-If Defense Simulation Handler
  const handleSimulate = async (actionType: any, targetEntity: string) => {
    setIsSimulating(true);
    try {
      const res = await apiService.simulateDefense({
        action_type: actionType,
        target_entity: targetEntity,
        horizon: 5,
      });
      setSimulation(res);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // 4. Replay Step Execution
  const handleReplayStep = useCallback(
    async (stepIndex: number) => {
      setReplayStep(stepIndex);
      try {
        const res = await apiService.executeReplayStep({
          scenario_id: selectedScenario,
          step_index: stepIndex,
          horizon: 5,
        });

        setCurrentState(res.current_state);
        setForecast(res.forecast);
        setTrajectory(res.trajectory);
        setLeadTimeEvaluations(res.lead_time_evaluations);

        const [ex, mi] = await Promise.all([
          apiService.getExplanation(4),
          apiService.getMitre(),
        ]);
        setExplanation(ex);
        setMitre(mi);
      } catch (err) {
        console.error("Failed to step replay:", err);
      }
    },
    [selectedScenario]
  );

  // 5. Dynamic PCAP Upload Handler
  const handleUploadPcap = async (file: File, windowDurationSec: number) => {
    setIsUploadingPcap(true);
    setPcapUploadError(null);
    try {
      const uploadRes = await apiService.uploadPcap(file, windowDurationSec);
      setSelectedScenario(uploadRes.scenario_id);
      setIsPlaying(false);
      setReplayStep(0);
      setLeadTimeEvaluations([]);
      await apiService.resetReplay();

      const tl = await apiService.getReplayTimeline(uploadRes.scenario_id);
      setReplayTimeline(tl);

      const res = await apiService.executeReplayStep({
        scenario_id: uploadRes.scenario_id,
        step_index: 0,
        horizon: 5,
      });
      setCurrentState(res.current_state);
      setForecast(res.forecast);
      setTrajectory(res.trajectory);
      setLeadTimeEvaluations(res.lead_time_evaluations);

      const [ex, mi] = await Promise.all([
        apiService.getExplanation(4),
        apiService.getMitre(),
      ]);
      setExplanation(ex);
      setMitre(mi);
    } catch (err: any) {
      console.error("PCAP upload error:", err);
      setPcapUploadError(err.message || "Failed to process uploaded PCAP.");
      throw err;
    } finally {
      setIsUploadingPcap(false);
    }
  };

  // 6. Replay Scenario Change
  const handleScenarioChange = async (scenario: string) => {
    setSelectedScenario(scenario);
    setIsPlaying(false);
    setReplayStep(0);
    setLeadTimeEvaluations([]);
    await apiService.resetReplay();

    const tl = await apiService.getReplayTimeline(scenario);
    setReplayTimeline(tl);
    handleReplayStep(0);
  };

  // 7. Replay Playback Loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 2000 / playbackSpeed;
      playTimerRef.current = window.setInterval(() => {
        setReplayStep((prev) => {
          const maxSteps = replayTimeline?.total_steps || 10;
          if (prev >= maxSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          handleReplayStep(next);
          return next;
        });
      }, intervalMs);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, replayTimeline, handleReplayStep]);

  // 8. Reset Replay
  const handleResetReplay = async () => {
    setIsPlaying(false);
    setReplayStep(0);
    setLeadTimeEvaluations([]);
    await apiService.resetReplay();
    handleReplayStep(0);
  };

  const isLandingPage = currentPage === "home";

  return (
    <div className="min-h-screen bg-cyber-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 
        CONDITIONAL HEADER:
        1. On Landing Page: Minimal floating premium header (RAKSHAK | About, How It Works, Launch Platform)
        2. In Platform Dashboard: Application navigation (Forecast, Trajectory, Explainability, etc.) with exit button
      */}
      {isLandingPage ? (
        <LandingHeader
          onLaunchPlatform={() => handleNavigate("forecast")}
          onNavigateSection={handleLandingSectionScroll}
        />
      ) : (
        <PlatformNavbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onBackToLanding={() => handleNavigate("home")}
          isBackendHealthy={isBackendHealthy}
          mode={mode}
          onModeChange={setMode}
          scenarioType={replayTimeline?.scenario_type || "DEMO/SYNTHETIC"}
        />
      )}

      {/* Main Page Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 animate-fadeIn">
        {currentPage === "home" && <HomePage onNavigate={handleNavigate} />}

        {currentPage === "about" && <AboutPage onNavigate={handleNavigate} />}

        {currentPage === "how-it-works" && (
          <HowItWorksPage onNavigate={handleNavigate} />
        )}

        {currentPage === "forecast" && (
          <ForecastPage
            currentState={currentState}
            forecast={forecast}
            replayTimeline={replayTimeline}
            replayStep={replayStep}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            selectedScenario={selectedScenario}
            onScenarioChange={handleScenarioChange}
            onStepChange={handleReplayStep}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setPlaybackSpeed}
            onReset={handleResetReplay}
            onUploadPcap={handleUploadPcap}
            isUploading={isUploadingPcap}
            uploadError={pcapUploadError}
            leadTimeEvaluations={leadTimeEvaluations}
            explanation={explanation}
            mitre={mitre}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === "trajectory" && (
          <TrajectoryPage trajectory={trajectory} />
        )}

        {currentPage === "explainability" && (
          <ExplainabilityPage explanation={explanation} mitre={mitre} />
        )}

        {currentPage === "simulation" && (
          <SimulationPage
            simulation={simulation}
            onSimulate={handleSimulate}
            isSimulating={isSimulating}
          />
        )}

        {currentPage === "results" && (
          <ResultsPage metrics={metrics} risk={risk} />
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
