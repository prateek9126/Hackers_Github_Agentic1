"""
CLI Runner for SIH26153 Reproducible Preprocessing Pipeline.
"""
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath("."))

from data.preprocess_pipeline import DatasetPreprocessor

def main():
    raw_path = "data/raw/ctu13_scenario5.binetflow"
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} not found.")
        sys.exit(1)

    print("Executing SIH26153 Phase 3 Preprocessing Pipeline on CTU-13 Scenario 5...")
    preprocessor = DatasetPreprocessor(
        window_duration_sec=20.0,
        history_window_w=4,
        forecast_horizon_k=1,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
    )
    report = preprocessor.run_full_pipeline(
        raw_data_path=raw_path,
        output_dir="data/processed",
    )
    print("\nSUCCESS: Dataset successfully preprocessed into clean chronological tensors.")

if __name__ == "__main__":
    main()
