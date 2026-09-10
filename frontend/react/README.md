# SIH26153 React Frontend Dashboard

## Architecture Overview
The user interface is built with **React 18**, **TypeScript**, and **Tailwind CSS**, providing a high-performance, real-time Security Operations Center (SOC) dashboard.

### Core Visualizations & Components
1. **Network State Timeline (`src/components/timeline/`)**:
   - Visualizes historical observation windows $[S(t-3), S(t-2), S(t-1), S(t)]$.
   - Interactive slider to navigate window history and inspect raw telemetry features.
2. **Multi-Horizon Forecast Trajectory (`src/components/forecast/`)**:
   - Built with **Recharts**.
   - Renders multi-step probability trajectory cones across $t+1, t+2, t+K$.
   - Displays forecast lead time (seconds) and confidence bounds.
3. **Attack Progression Graph (`src/components/attack_graph/`)**:
   - Built with **React Flow** or **D3.js**.
   - Interactive directed graph representing the 10 canonical Cyber Kill Chain stages.
   - Highlights the current node and animates pulsating/glowing edges towards forecasted high-probability future nodes.
4. **Explainability Waterfall (`src/components/explainability/`)**:
   - Bar chart displaying top contributing telemetry features (e.g. `syn_ratio`, `fanout_entropy`).
   - Plain-English threat intelligence narrative explaining why the model predicted stage escalation.
5. **What-If Defense Sandbox (`src/components/simulation/`)**:
   - Allows SOC analysts to select candidate mitigations (e.g. "Isolate Host", "Block Port 445", "Rate Limit SYN").
   - Instantly triggers counterfactual re-forecasting and displays side-by-side Before/After trajectory cones and the **Future Risk Reduction Meter (ΔRisk)**.

## Getting Started
```bash
cd frontend/react
npm install
npm run dev
```
Runs on `http://localhost:3000` (or `http://localhost:5173`).
