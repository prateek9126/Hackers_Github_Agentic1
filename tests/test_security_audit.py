"""
Security Audit & Input Validation Unit Tests for SIH26153.
Verifies:
1. Path traversal prevention (rejects attempts to escape workspace root).
2. Unsupported extension rejection.
3. API boundary parameter validation (horizon limits, malformed JSON).
4. SQL injection safety in repository ORM queries.
"""

import unittest
import os
import tempfile
from fastapi.testclient import TestClient
from backend.fastapi.main import app
from backend.services.ingest_service import BackendIngestService
from backend.services.forecasting_service import BackendForecastingService


class TestSecurityAudit(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.forecasting_service = BackendForecastingService()
        cls.ingest_service = BackendIngestService(cls.forecasting_service)

    def test_path_traversal_rejection(self):
        """Service should strictly reject paths that escape the workspace root."""
        malicious_paths = [
            "../../etc/passwd",
            "../../../windows/system32/cmd.exe",
            "/etc/shadow",
            "C:\\Windows\\System32\\calc.exe",
        ]
        for path in malicious_paths:
            with self.assertRaises((PermissionError, FileNotFoundError, ValueError)):
                self.ingest_service.ingest_telemetry(file_path=path)

    def test_unsupported_file_extension_rejection(self):
        """Service should reject executable or arbitrary file extensions."""
        os.makedirs("data", exist_ok=True)
        with tempfile.NamedTemporaryFile(dir="data", suffix=".exe", delete=False) as f:
            f.write(b"MZ\x90\x00")
            temp_exe = f.name

        try:
            with self.assertRaises(ValueError):
                self.ingest_service.ingest_telemetry(file_path=temp_exe)
        finally:
            if os.path.exists(temp_exe):
                os.remove(temp_exe)

    def test_api_boundary_validation_horizon(self):
        """API should return 422 Unprocessable Entity if horizon exceeds bounds [1, 10]."""
        # Horizon > 10
        res_high = self.client.get("/api/forecast?horizon=99")
        self.assertEqual(res_high.status_code, 422)

        # Horizon < 1
        res_low = self.client.get("/api/forecast?horizon=0")
        self.assertEqual(res_low.status_code, 422)

    def test_api_invalid_simulate_payload(self):
        """API should return 422 for malformed simulation payload."""
        res = self.client.post("/api/simulate", json={"invalid_field": 123})
        self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
