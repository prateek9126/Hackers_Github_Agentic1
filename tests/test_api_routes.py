"""
Integration Tests for SIH26153 FastAPI Endpoints.
Tests all 9 REST API endpoints using FastAPI TestClient:
- POST /api/ingest
- GET /api/current-state
- GET /api/forecast
- GET /api/trajectory
- GET /api/explanation
- GET /api/mitre
- POST /api/simulate
- GET /api/risk
- GET /api/metrics
- GET /api/health
"""

import unittest
from fastapi.testclient import TestClient
from backend.fastapi.main import app


class TestFastAPIRoutes(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_and_health(self):
        """Root and health endpoints should return 200 with online status."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "online")

        health_res = self.client.get("/api/health")
        self.assertEqual(health_res.status_code, 200)
        data = health_res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)

    def test_get_current_state(self):
        """GET /api/current-state should return window features and stage."""
        res = self.client.get("/api/current-state")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("window_index", data)
        self.assertIn("ground_truth_stage", data)
        self.assertIn("top_features", data)
        self.assertIsInstance(data["top_features"], dict)

    def test_get_forecast(self):
        """GET /api/forecast should return K-step predictions and probabilities."""
        res = self.client.get("/api/forecast?horizon=4")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["forecast_horizon"], 4)
        self.assertEqual(len(data["forecast"]), 4)
        self.assertIn("next_stage_probabilities", data)

    def test_get_trajectory(self):
        """GET /api/trajectory should return graph nodes, edges, and risk scores."""
        res = self.client.get("/api/trajectory?horizon=5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["forecast_horizon"], 5)
        # 6 nodes: step 0 (observed) + steps 1..5 (predicted)
        self.assertEqual(len(data["nodes"]), 6)
        self.assertEqual(len(data["edges"]), 5)
        self.assertEqual(len(data["cumulative_risk_trajectory"]), 6)

    def test_get_explanation(self):
        """GET /api/explanation should return Integrated Gradients / SHAP signals."""
        res = self.client.get("/api/explanation?top_n=3")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("explainer_type", data)
        self.assertIn("predicted_stage", data)
        self.assertEqual(len(data["top_signals"]), 3)
        self.assertIn("direction", data["top_signals"][0])

    def test_get_mitre(self):
        """GET /api/mitre should return evidence-based techniques."""
        res = self.client.get("/api/mitre")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_techniques", data)
        self.assertIn("techniques", data)
        if data["total_techniques"] > 0:
            tech = data["techniques"][0]
            self.assertIn("technique_id", tech)
            self.assertIn("status", tech)
            self.assertIn(tech["status"], ["OBSERVED TECHNIQUE", "PREDICTED TECHNIQUE"])

    def test_post_simulate(self):
        """POST /api/simulate should execute What-If defense simulation."""
        payload = {
            "action_type": "HOST_ISOLATION",
            "target_entity": "192.168.1.105",
            "horizon": 4,
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("SIMULATED DEFENSE OUTCOME", data["disclaimer"])
        self.assertIn("risk_difference", data)
        self.assertIn("risk_reduction_pct", data)
        self.assertEqual(len(data["simulated_forecast"]), 4)

    def test_get_risk(self):
        """GET /api/risk should return current and forward risk trajectory."""
        res = self.client.get("/api/risk")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("current_risk", data)
        self.assertIn("forward_risk_trajectory", data)

    def test_get_metrics(self):
        """GET /api/metrics should return benchmark accuracy and lead time."""
        res = self.client.get("/api/metrics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("k_step_accuracy", data)
        self.assertIn("mean_lead_time_sec", data)
        self.assertGreater(data["mean_lead_time_sec"], 0.0)

    def test_post_ingest(self):
        """POST /api/ingest should return completed ingestion status."""
        payload = {"window_sec": 20.0}
        res = self.client.post("/api/ingest", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "completed")
        self.assertGreater(data["flows_processed"], 0)


if __name__ == "__main__":
    unittest.main()
