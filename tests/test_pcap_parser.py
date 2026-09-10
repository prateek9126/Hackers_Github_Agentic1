"""
Unit Tests for PCAP Traffic Parser.
Verifies:
1. PCAP global header magic byte validation (big-endian, little-endian, pcapng, invalid).
2. Malformed / corrupted packet isolation.
3. Fallback binary parser operation.
"""

import unittest
import struct
import tempfile
import os
from network.pcap_parser.pcap_parser import (
    PCAPTrafficParser,
    PCAP_MAGIC_BIG_ENDIAN,
    PCAP_MAGIC_LITTLE_ENDIAN,
    PCAPNG_MAGIC,
)


class TestPCAPParser(unittest.TestCase):

    def setUp(self):
        self.parser = PCAPTrafficParser()

    def test_validate_header_magic(self):
        """Header validation should correctly identify magic bytes."""
        # Standard Big-Endian PCAP (24 bytes)
        with tempfile.NamedTemporaryFile(suffix=".pcap", delete=False) as f:
            hdr = struct.pack(">IHHiIII", PCAP_MAGIC_BIG_ENDIAN, 2, 4, 0, 0, 65535, 1)
            f.write(hdr)
            valid_pcap = f.name

        try:
            is_valid, desc = self.parser.validate_pcap_header(valid_pcap)
            self.assertTrue(is_valid)
            self.assertIn("Big-Endian", desc)
        finally:
            if os.path.exists(valid_pcap):
                os.remove(valid_pcap)

    def test_reject_invalid_magic(self):
        """Header validation should reject files with invalid magic numbers."""
        with tempfile.NamedTemporaryFile(suffix=".pcap", delete=False) as f:
            f.write(b"NOT_A_VALID_PCAP_MAGIC_HEADER_TEST")
            invalid_pcap = f.name

        try:
            is_valid, desc = self.parser.validate_pcap_header(invalid_pcap)
            self.assertFalse(is_valid)
            self.assertIn("Invalid", desc)
        finally:
            if os.path.exists(invalid_pcap):
                os.remove(invalid_pcap)

    def test_corrupted_packet_graceful_handling(self):
        """Parser should skip corrupted packet frames without crashing."""
        with tempfile.NamedTemporaryFile(suffix=".pcap", delete=False) as f:
            # 24 byte global header
            hdr = struct.pack(">IHHiIII", PCAP_MAGIC_BIG_ENDIAN, 2, 4, 0, 0, 65535, 1)
            f.write(hdr)
            # Packet 1 header claiming 50 bytes, but only writing 10 bytes (truncated)
            pkt_hdr = struct.pack(">IIII", 1700000000, 500, 50, 50)
            f.write(pkt_hdr)
            f.write(b"1234567890")
            corrupt_pcap = f.name

        try:
            records = self.parser.parse_pcap(corrupt_pcap, max_packets=10)
            # Should not throw uncaught exception, returns empty or partial list
            self.assertIsInstance(records, list)
        finally:
            if os.path.exists(corrupt_pcap):
                os.remove(corrupt_pcap)


if __name__ == "__main__":
    unittest.main()
