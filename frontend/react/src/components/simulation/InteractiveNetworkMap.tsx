import React from "react";
import {
  Shield,
  Lock,
  Ban,
  ArrowUpRight,
  Server,
  Globe,
  Database,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type DefenseActionId =
  | "HOST_ISOLATION"
  | "BLOCK_DESTINATION_PORT"
  | "BLOCK_SUSPICIOUS_SOURCE"
  | "RESTRICT_OUTBOUND_TRAFFIC";

interface InteractiveNetworkMapProps {
  actionId: DefenseActionId;
  isApplied: boolean;
  targetEntity: string;
}

export const InteractiveNetworkMap: React.FC<InteractiveNetworkMapProps> = ({
  actionId,
  isApplied,
  targetEntity,
}) => {
  // Determine link & node states based on active defense and whether it's applied
  const isHostIsolated = actionId === "HOST_ISOLATION" && isApplied;
  const isPortBlocked = actionId === "BLOCK_DESTINATION_PORT" && isApplied;
  const isSourceBlocked = actionId === "BLOCK_SUSPICIOUS_SOURCE" && isApplied;
  const isOutboundRestricted = actionId === "RESTRICT_OUTBOUND_TRAFFIC" && isApplied;

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] bg-cyber-950 rounded-2xl border border-cyan-900/40 overflow-hidden shadow-inner flex items-center justify-center p-2">
      {/* SVG Network Canvas */}
      <svg
        viewBox="0 0 600 380"
        className="w-full h-full max-h-[380px] select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Cyan Glow Filter */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Red/Danger Glow Filter */}
          <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Animated Dash Stroke for Packets */}
          <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>

        {/* ================= BACKGROUND GRID ================= */}
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#101a2e" strokeWidth="0.8" />
        </pattern>
        <rect width="600" height="380" fill="url(#grid)" />

        {/* ================= NETWORK CONNECTIONS (EDGES) ================= */}

        {/* 1. Internet to Gateway (x: 300, y: 45 -> x: 300, y: 135) */}
        <line
          x1="300"
          y1="55"
          x2="300"
          y2="135"
          stroke={isOutboundRestricted ? "#f59e0b" : "#38bdf8"}
          strokeWidth={isOutboundRestricted ? "2" : "2"}
          strokeDasharray={isOutboundRestricted ? "4,4" : "none"}
          className={!isOutboundRestricted ? "opacity-80" : "opacity-90"}
        />
        {/* Outbound restriction marker */}
        {isOutboundRestricted && (
          <g transform="translate(300, 95)">
            <rect x="-65" y="-12" width="130" height="24" rx="12" fill="#451a03" stroke="#f59e0b" strokeWidth="1" />
            <text x="0" y="4" fill="#fef08a" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ✕ EGRESS RESTRICTED
            </text>
          </g>
        )}

        {/* 2. Suspicious Source to Gateway (x: 100, y: 135 -> x: 300, y: 135) */}
        <line
          x1="135"
          y1="135"
          x2="265"
          y2="135"
          stroke={isSourceBlocked ? "#f43f5e" : "#f43f5e"}
          strokeWidth="2"
          strokeDasharray={isSourceBlocked ? "6,4" : "none"}
          className={isSourceBlocked ? "opacity-40" : "animate-pulse"}
        />
        {isSourceBlocked && (
          <g transform="translate(200, 135)">
            <circle cx="0" cy="0" r="14" fill="#881337" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="0" y="4" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">✕</text>
            <text x="0" y="24" fill="#fca5a5" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              BLOCKED
            </text>
          </g>
        )}

        {/* 3. Gateway to Target Host (x: 300, y: 135 -> x: 300, y: 240) */}
        <line
          x1="300"
          y1="165"
          x2="300"
          y2="235"
          stroke={isHostIsolated ? "#f43f5e" : isPortBlocked ? "#f59e0b" : "#00f0ff"}
          strokeWidth={isHostIsolated ? "1.5" : "2.5"}
          strokeDasharray={isHostIsolated ? "5,5" : "none"}
          className={isHostIsolated ? "opacity-30" : ""}
        />
        {/* Host Isolation Severed Connection Badge */}
        {isHostIsolated && (
          <g transform="translate(300, 200)">
            <circle cx="0" cy="0" r="14" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="0" y="4" fill="#f43f5e" fontSize="13" fontWeight="bold" textAnchor="middle">✕</text>
            <text x="0" y="25" fill="#fda4af" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              SEVERED
            </text>
          </g>
        )}
        {/* Port Blocked Badge */}
        {isPortBlocked && (
          <g transform="translate(300, 200)">
            <rect x="-65" y="-12" width="130" height="24" rx="12" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
            <text x="0" y="4" fill="#fde047" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ✕ PORT 445 BLOCKED
            </text>
          </g>
        )}

        {/* 4. Target Host to Database (x: 300, y: 255 -> x: 140, y: 325) */}
        <line
          x1="270"
          y1="260"
          x2="155"
          y2="315"
          stroke={isHostIsolated ? "#334155" : "#00f0ff"}
          strokeWidth={isHostIsolated ? "1" : "2"}
          strokeDasharray={isHostIsolated ? "4,4" : "none"}
          className={isHostIsolated ? "opacity-30" : "opacity-70"}
        />

        {/* 5. Target Host to Workstation (x: 300, y: 255 -> x: 460, y: 325) */}
        <line
          x1="330"
          y1="260"
          x2="445"
          y2="315"
          stroke={isHostIsolated ? "#334155" : "#00f0ff"}
          strokeWidth={isHostIsolated ? "1" : "2"}
          strokeDasharray={isHostIsolated ? "4,4" : "none"}
          className={isHostIsolated ? "opacity-30" : "opacity-70"}
        />

        {/* ================= NETWORK NODES ================= */}

        {/* NODE 1: External Internet (Top) */}
        <g transform="translate(300, 45)">
          <circle cx="0" cy="0" r="22" fill="#0b1220" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="16" fill="#0f172a" />
          <Globe className="text-cyan-400" x="-10" y="-10" width="20" height="20" />
          <text x="0" y="34" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
            External Network
          </text>
        </g>

        {/* NODE 2: Suspicious Source (Top-Left) */}
        <g transform="translate(100, 135)">
          <circle
            cx="0"
            cy="0"
            r={isSourceBlocked ? "24" : "26"}
            fill="#1e0a14"
            stroke={isSourceBlocked ? "#f43f5e" : "#e11d48"}
            strokeWidth="2"
            filter={isSourceBlocked ? "url(#glow-red)" : "none"}
          />
          <circle cx="0" cy="0" r="18" fill="#2e0814" />
          {isSourceBlocked ? (
            <Ban className="text-rose-400" x="-10" y="-10" width="20" height="20" />
          ) : (
            <AlertTriangle className="text-rose-400" x="-10" y="-10" width="20" height="20" />
          )}
          <text x="0" y="35" fill="#fda4af" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            {isSourceBlocked ? "QUARANTINED" : "Suspicious Source"}
          </text>
          <text x="0" y="47" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
            Scanner / Probe
          </text>
        </g>

        {/* NODE 3: Gateway / Border Firewall (Center) */}
        <g transform="translate(300, 135)">
          <rect
            x="-36"
            y="-18"
            width="72"
            height="36"
            rx="10"
            fill="#0b1220"
            stroke={isPortBlocked || isOutboundRestricted ? "#f59e0b" : "#38bdf8"}
            strokeWidth="1.8"
          />
          <Shield className="text-cyan-400" x="-10" y="-10" width="20" height="20" />
          <text x="0" y="32" fill="#cbd5e1" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            Gateway Firewall
          </text>
        </g>

        {/* NODE 4: Target Host / Server (Main Target) */}
        <g transform="translate(300, 255)">
          {/* Highlighting pulse halo around target */}
          <circle
            cx="0"
            cy="0"
            r={isHostIsolated ? "34" : "32"}
            fill={isHostIsolated ? "rgba(244,63,94,0.15)" : "rgba(0,240,255,0.12)"}
            stroke={isHostIsolated ? "#f43f5e" : "#00f0ff"}
            strokeWidth={isHostIsolated ? "2.5" : "2"}
            filter={isHostIsolated ? "url(#glow-red)" : "url(#glow-cyan)"}
            className={!isHostIsolated ? "animate-pulse" : ""}
          />
          <rect
            x="-26"
            y="-22"
            width="52"
            height="44"
            rx="8"
            fill="#060913"
            stroke={isHostIsolated ? "#f43f5e" : "#00f0ff"}
            strokeWidth="1.5"
          />
          {isHostIsolated ? (
            <Lock className="text-rose-400" x="-10" y="-12" width="20" height="20" />
          ) : (
            <Server className="text-cyan-400" x="-10" y="-12" width="20" height="20" />
          )}

          {/* Node Status Badge */}
          <g transform="translate(0, 36)">
            <rect
              x="-55"
              y="-10"
              width="110"
              height="20"
              rx="10"
              fill={isHostIsolated ? "#881337" : "#083344"}
              stroke={isHostIsolated ? "#f43f5e" : "#06b6d4"}
              strokeWidth="1"
            />
            <text
              x="0"
              y="3"
              fill={isHostIsolated ? "#ffffff" : "#67e8f9"}
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {isHostIsolated ? "🔒 ISOLATED" : "TARGET HOST"}
            </text>
          </g>

          <text x="0" y="58" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
            {targetEntity || "192.168.1.150"}
          </text>
        </g>

        {/* NODE 5: Internal Database (Bottom-Left) */}
        <g transform="translate(130, 325)">
          <circle cx="0" cy="0" r="22" fill="#0b1220" stroke="#3b82f6" strokeWidth="1.5" />
          <Database className="text-blue-400" x="-10" y="-10" width="20" height="20" />
          <text x="0" y="32" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
            Database Server
          </text>
          <text x="0" y="44" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
            Internal DB
          </text>
        </g>

        {/* NODE 6: Workstation Endpoint (Bottom-Right) */}
        <g transform="translate(470, 325)">
          <circle cx="0" cy="0" r="22" fill="#0b1220" stroke="#3b82f6" strokeWidth="1.5" />
          <Laptop className="text-blue-400" x="-10" y="-10" width="20" height="20" />
          <text x="0" y="32" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
            Internal Endpoint
          </text>
          <text x="0" y="44" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
            Workstation
          </text>
        </g>
      </svg>

      {/* Dynamic Status Overlay Tag (Top-Left) */}
      <div className="absolute top-3 left-3 bg-cyber-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center space-x-2 shadow-lg">
        <span
          className={`w-2 h-2 rounded-full ${
            isApplied ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"
          }`}
        />
        <span>
          {isApplied ? "DEFENSE APPLIED IN SIMULATION" : "LIVE SIMULATED TOPOLOGY"}
        </span>
      </div>

      {/* Target Details Badge (Top-Right) */}
      <div className="absolute top-3 right-3 bg-cyber-900/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 shadow-lg">
        Target: <span className="text-cyan-300 font-bold">{targetEntity}</span>
      </div>
    </div>
  );
};
