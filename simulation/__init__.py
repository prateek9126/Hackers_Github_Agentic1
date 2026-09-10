"""
Simulation package for SIH26153.
Provides counterfactual what-if defense simulation and risk reduction computation.
"""

from .defense_simulator import DefenseSimulator, SimulatedDefenseAction, SimulationResult

__all__ = ["DefenseSimulator", "SimulatedDefenseAction", "SimulationResult"]
