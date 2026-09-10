import React, { useState, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  Database,
  Lock,
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { ReplayTimelineResponse, ReplayTimelineStep } from "../../types/api";

interface ReplayControllerProps {
  timelineData: ReplayTimelineResponse | null;
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedScenario: string;
  onScenarioChange: (scenario: string) => void;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onUploadPcap?: (file: File, windowDurationSec: number) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
}

export const ReplayController: React.FC<ReplayControllerProps> = ({
  timelineData,
  currentStep,
  isPlaying,
  playbackSpeed,
  selectedScenario,
  onScenarioChange,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
  onReset,
  onUploadPcap,
  isUploading = false,
  uploadError = null,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [windowSec, setWindowSec] = useState<number>(20);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalSteps = timelineData?.total_steps || 10;
  const steps = timelineData?.timeline || [];
  const isUploadedMode = timelineData?.scenario_type === "UPLOADED_PCAP";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.toLowerCase();
      if (!ext.endsWith(".pcap") && !ext.endsWith(".pcapng") && !ext.endsWith(".cap")) {
        setLocalError("Please select a valid .pcap or .pcapng network capture file.");
        setSelectedFile(null);
        return;
      }
      if (file.size === 0) {
        setLocalError("Selected file is empty (0 bytes).");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleTriggerAnalyze = async () => {
    if (!selectedFile || !onUploadPcap) return;
    try {
      setLocalError(null);
      await onUploadPcap(selectedFile, windowSec);
    } catch (err: any) {
      setLocalError(err?.message || "PCAP analysis failed.");
    }
  };

  return (
    <div className="cyber-card rounded-xl p-5 border border-cyan-500/40 bg-cyber-900/90 shadow-2xl font-mono text-xs space-y-4">
      {/* Top Banner & Scenario Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Offline PCAP & Sequential Replay Engine
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                  isUploadedMode
                    ? "bg-cyan-950/90 text-cyan-300 border-cyan-500/60"
                    : "bg-amber-950/80 text-amber-400 border-amber-700"
                }`}
              >
                Source: {isUploadedMode ? "UPLOADED PCAP" : timelineData?.scenario_type || "DEMO/SYNTHETIC"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strict Causal Isolation &bull; Future ground truth withheld until observation timestamp arrives
            </p>
          </div>
        </div>

        {/* Dynamic Dataset Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-bold">Dataset:</span>
          <Database className="w-4 h-4 text-slate-400" />
          <select
            value={selectedScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 max-w-[260px] truncate"
          >
            {timelineData?.available_scenarios && timelineData.available_scenarios.length > 0 ? (
              timelineData.available_scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.type})
                </option>
              ))
            ) : (
              <>
                <option value="synthetic">Demo/Synthetic (10 Windows)</option>
                <option value="ctu13">CTU-13 Scenario 5 (Virut Real Dataset)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* PCAP Upload Section */}
      <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pcap,.pcapng,.cap"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-all text-xs font-bold"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{selectedFile ? "Change PCAP" : "Upload PCAP"}</span>
          </button>

          {/* Window Duration Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-400 text-[11px]">
            <span>Window Size:</span>
            {[20, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => setWindowSec(sec)}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  windowSec === sec
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Selected File Label */}
          {selectedFile && (
            <span className="text-[11px] text-cyan-300 font-bold bg-cyan-950/50 px-2 py-1 rounded border border-cyan-800/60 truncate max-w-[200px]">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleTriggerAnalyze}
            disabled={!selectedFile || isUploading}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-slate-950 hover:bg-emerald-500 font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing PCAP...</span>
              </>
            ) : (
              <>
                <FileUp className="w-3.5 h-3.5" />
                <span>Analyze PCAP</span>
              </>
            )}
          </button>
        </div>

        {/* Causal Notice */}
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Accepts .pcap / .pcapng &bull; Zero future lookahead
        </span>
      </div>

      {/* Error Display */}
      {(localError || uploadError) && (
        <div className="p-2.5 rounded bg-rose-950/40 border border-rose-600/50 text-rose-300 flex items-center space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{localError || uploadError}</span>
        </div>
      )}

      {/* Uploaded PCAP Summary Banner (Visible for Uploaded Captures) */}
      {isUploadedMode && (
        <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">PCAP:</span>
                <strong className="text-slate-100 font-bold text-sm">
                  {timelineData?.pcap_filename || "demo_attack_progression.pcap"}
                </strong>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {timelineData?.status || "ANALYZED"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-300">
                <span>
                  Packets: <strong className="text-cyan-400">{timelineData?.packet_count ?? 14}</strong>
                </span>
                <span>
                  Duration: <strong className="text-cyan-400">{timelineData?.duration_sec ?? 82}s</strong>
                </span>
                <span>
                  Windows: <strong className="text-cyan-400">{totalSteps}</strong>
                </span>
                <span>
                  Window Size: <strong className="text-cyan-400">{timelineData?.window_duration_sec ?? 20}s</strong>
                </span>
                {timelineData?.file_size_bytes && (
                  <span>
                    Size: <strong className="text-cyan-400">{(timelineData.file_size_bytes / 1024).toFixed(1)} KB</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-amber-800/60 text-amber-300 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Ground Truth: <strong>UNAVAILABLE (Unlabeled Capture)</strong></span>
          </div>
        </div>
      )}

      {/* Control Buttons & Playback Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2">
          {/* Step Back */}
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-30 transition-all"
            title="Step Back"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all shadow-md ${
              isPlaying
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20"
                : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20"
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? "Pause Replay" : "Start Replay"}</span>
          </button>

          {/* Step Forward */}
          <button
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep >= totalSteps - 1}
            className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-30 transition-all"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Reset to Step 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-400">
          <span className="text-[11px]">Speed:</span>
          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => onSpeedChange(spd)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                playbackSpeed === spd
                  ? "bg-cyan-500 text-slate-950"
                  : "hover:text-slate-200"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Timeline Scrubber */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <strong className="text-slate-200">Current Step: #{currentStep}</strong>
            <span>(&Delta;t = +{currentStep * (timelineData?.window_duration_sec || 20)}s elapsed)</span>
          </span>
          <span className="text-slate-500">
            Total Steps: {totalSteps} &bull; Window Size: {timelineData?.window_duration_sec || 20}s
          </span>
        </div>

        {/* Timeline Track */}
        <div
          className="grid gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800"
          style={{ gridTemplateColumns: `repeat(${Math.max(5, Math.min(10, totalSteps))}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepItem = steps[idx];
            const isCurrent = idx === currentStep;
            const isPast = idx < currentStep;
            const isFuture = idx > currentStep;

            return (
              <button
                key={idx}
                onClick={() => onStepChange(idx)}
                className={`p-2 rounded flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300 scale-105"
                    : isPast
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-900/60 text-slate-600 border border-dashed border-slate-800 hover:border-slate-700"
                }`}
              >
                <span className="text-[9px]">t{idx}</span>
                <span className="text-[10px] font-bold truncate max-w-[65px]">
                  {stepItem ? stepItem.stage_name.slice(0, 6) : `S${idx}`}
                </span>
                {isFuture && <Lock className="w-2.5 h-2.5 mt-0.5 text-slate-600" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

