"""
Network ingestion and flow telemetry package for SIH26153.
Provides modules for CSV, PCAP, and Zeek ingestion, unified schema normalization,
and multi-dimensional feature extraction.
"""

from .schema import UnifiedTrafficRecord
from .csv_parser import CSVTrafficParser
from .feature_extraction.feature_extractor import NetworkFeatureExtractor, calculate_shannon_entropy

__all__ = [
    "UnifiedTrafficRecord",
    "CSVTrafficParser",
    "NetworkFeatureExtractor",
    "calculate_shannon_entropy",
]
