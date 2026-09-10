"""
SIH26153 States Package
Handles attack stage taxonomy, dataset labeling mappings, temporal windowing,
network state vector aggregation, zero-leakage normalization, and leakage validation.
"""

from .taxonomy import AttackStage, STAGE_SEVERITY_WEIGHTS, STAGE_NAMES, stage_to_str, str_to_stage
from .labeling import DatasetLabelMapper
from .state_builder import NetworkStateVector, StateBuilder
from .windowing import TemporalWindowSequenceBuilder
from .temporal_engine import TemporalStateEngine
from .normalizer import TemporalStateScaler
from .leakage_validator import TemporalLeakageValidator, TemporalLeakageError

__all__ = [
    "AttackStage",
    "STAGE_SEVERITY_WEIGHTS",
    "STAGE_NAMES",
    "stage_to_str",
    "str_to_stage",
    "DatasetLabelMapper",
    "NetworkStateVector",
    "StateBuilder",
    "TemporalWindowSequenceBuilder",
    "TemporalStateEngine",
    "TemporalStateScaler",
    "TemporalLeakageValidator",
    "TemporalLeakageError",
]
