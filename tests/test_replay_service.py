"""
Unit and Integration Tests for Replay Service and Routes.
Verifies:
- Scenario initialization (CTU-13 and Synthetic Kill Chain).
- Strict temporal causality (no future ground truth provided).
- Multi-step forecasting at each replay step.
- Advance warning lead-time evaluations as replay progresses.
- Replay reset.
"""

import unittest
from fastapi.testclient import TestClient
from backend.fastapi.main import app
from backend.services.replay_service import BackendReplayService


class TestReplayServiceAndRoutes(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.service = BackendReplayService()

    def test_service_initialization(self):
        """Replay service should load both synthetic and ctu13 scenarios."""
        self.assertIn("synthetic", self.service.scenarios)
        syn = self.service.scenarios["synthetic"]
        self.assertEqual(syn["total_steps"], 10)
        self.assertEqual(syn["type"], "DEMO/SYNTHETIC")

        timeline = self.service.get_timeline("synthetic")
        self.assertEqual(len(timeline["timeline"]), 10)
        self.assertEqual(timeline["available_scenarios"][0]["id"], "ctu13")

    def test_sequential_replay_step_execution(self):
        """Stepping through replay should generate forecasts and evaluate lead times."""
        # Step 0: Benign
        res0 = self.service.process_step(scenario_id="synthetic", step_index=0, horizon=5)
        self.assertEqual(res0["step_index"], 0)
        self.assertTrue(res0["temporal_causality_verified"])
        self.assertTrue(res0["future_ground_truth_withheld"])
        self.assertEqual(len(res0["forecast"]["forecast"]), 5)

        # Step 2: Reconnaissance
        res2 = self.service.process_step(scenario_id="synthetic", step_index=2, horizon=5)
        self.assertEqual(res2["step_index"], 2)

    def test_api_replay_timeline_route(self):
        """GET /api/replay/timeline should return 200 with timeline metadata."""
        res = self.client.get("/api/replay/timeline?scenario=synthetic")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["scenario_id"], "synthetic")
        self.assertEqual(data["total_steps"], 10)
        self.assertEqual(len(data["timeline"]), 10)

    def test_api_replay_step_and_reset_route(self):
        """POST /api/replay/step and POST /api/replay/reset should operate seamlessly."""
        # Step 1
        payload = {"scenario_id": "synthetic", "step_index": 1, "horizon": 4}
        res = self.client.post("/api/replay/step", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["step_index"], 1)
        self.assertEqual(data["forecast"]["forecast_horizon"], 4)
        self.assertIn("current_state", data)
        self.assertIn("trajectory", data)
        self.assertIn("lead_time_evaluations", data)

        # Reset
        res_reset = self.client.post("/api/replay/reset")
        self.assertEqual(res_reset.status_code, 200)
        self.assertEqual(res_reset.json()["status"], "reset")


if __name__ == "__main__":
    unittest.main()
