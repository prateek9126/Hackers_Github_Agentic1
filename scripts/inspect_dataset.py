"""
SIH26153 Dataset Quality & Structure Inspection Tool.
Examines real public cybersecurity dataset across all 7 required dimensions:
1. Dataset structure & schema
2. Timestamp ranges, resolution, and monotonicity
3. All unique labels & string variations
4. Class distribution & imbalance
5. Duplicate record detection
6. Temporal ordering & progression analysis
7. Attack progression forecasting feasibility
"""

import os
import sys
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath("."))


def inspect_dataset(file_path: str):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    print("=" * 80)
    print("SIH26153: DATASET STRUCTURE & QUALITY INSPECTION REPORT")
    print(f"Target File: {file_path}")
    print(f"File Size  : {os.path.getsize(file_path) / (1024 * 1024):.2f} MB")
    print("=" * 80)

    # 1. Structure
    print("\n[1] Loading dataset...")
    df = pd.read_csv(file_path, low_memory=False)
    print(f"    - Total Rows: {len(df):,}")
    print(f"    - Total Columns: {len(df.columns)}")
    print(f"    - Columns: {list(df.columns)}")
    print(f"    - Missing Values per Column:")
    nulls = df.isnull().sum()
    for col, count in nulls[nulls > 0].items():
        print(f"        {col}: {count:,} ({count/len(df)*100:.2f}%)")
    if nulls.sum() == 0:
        print("        None (0 missing values across all columns)")

    # 2. Timestamps
    print("\n[2] Timestamp Inspection:")
    ts_col = [c for c in df.columns if "time" in c.lower() or "date" in c.lower()][0]
    print(f"    - Identified Timestamp Column: '{ts_col}'")
    sample_ts = df[ts_col].head(3).tolist()
    print(f"    - Sample Values: {sample_ts}")
    df['parsed_time'] = pd.to_datetime(df[ts_col])
    t_start = df['parsed_time'].min()
    t_end = df['parsed_time'].max()
    duration = t_end - t_start
    print(f"    - Earliest Timestamp: {t_start}")
    print(f"    - Latest Timestamp  : {t_end}")
    print(f"    - Total Duration    : {duration} ({duration.total_seconds():,.1f} seconds)")

    # Monotonicity check
    is_monotonic = df['parsed_time'].is_monotonic_increasing
    print(f"    - Monotonically Increasing: {is_monotonic}")
    if not is_monotonic:
        inversions = (df['parsed_time'].diff().dt.total_seconds() < 0).sum()
        print(f"    - Timestamp Inversions: {inversions:,} (Requires chronological sorting)")

    # 3. Label Inspection
    print("\n[3] Label Inspection:")
    label_col = [c for c in df.columns if "label" in c.lower() or "class" in c.lower() or "attack" in c.lower()][0]
    print(f"    - Identified Label Column: '{label_col}'")
    unique_labels = df[label_col].value_counts(dropna=False)
    print(f"    - Total Unique Raw Labels: {len(unique_labels)}")
    print("\n    Raw Label Breakdown:")
    for lbl, count in unique_labels.items():
        print(f"      {str(lbl):<45} : {count:7,d} ({count/len(df)*100:6.2f}%)")

    # 4. Class Imbalance
    print("\n[4] Class Imbalance Analysis:")
    # Detect benign vs malicious
    is_malicious = df[label_col].astype(str).str.contains("botnet|attack|malware|portscan", case=False)
    mal_count = is_malicious.sum()
    ben_count = len(df) - mal_count
    print(f"    - Benign / Background Flows: {ben_count:,} ({ben_count/len(df)*100:.2f}%)")
    print(f"    - Malicious / Attack Flows : {mal_count:,} ({mal_count/len(df)*100:.2f}%)")
    print(f"    - Imbalance Ratio          : 1 : {ben_count / max(1, mal_count):.1f}")

    # 5. Duplicate Records
    print("\n[5] Duplicate Records Inspection:")
    exact_dups = df.duplicated().sum()
    print(f"    - Exact Full-Row Duplicates : {exact_dups:,} ({exact_dups/len(df)*100:.2f}%)")
    # 5-tuple duplicates
    five_tuple_cols = [c for c in df.columns if any(k in c.lower() for k in ["src", "dst", "sport", "dport", "proto"])]
    if len(five_tuple_cols) >= 4:
        tuple_dups = df.duplicated(subset=five_tuple_cols).sum()
        print(f"    - 5-Tuple Re-occurrences    : {tuple_dups:,} ({tuple_dups/len(df)*100:.2f}%) (Expected in persistent flows)")

    # 6. Temporal Ordering & Progression Feasibility
    print("\n[6] Temporal Progression Analysis:")
    df_sorted = df.sort_values(by='parsed_time').copy()
    # Group by 60s windows to observe progression
    df_sorted['window_1m'] = df_sorted['parsed_time'].dt.floor('1min')
    window_summary = df_sorted.groupby('window_1m').agg(
        total_flows=(label_col, 'count'),
        attack_flows=(label_col, lambda s: s.astype(str).str.contains("botnet|attack", case=False).sum()),
        labels=(label_col, lambda s: list(s.unique()))
    )
    print(f"    - Total 1-Minute Windows Spanned: {len(window_summary)}")
    print(f"    - Windows with Active Attack Flows: {(window_summary['attack_flows'] > 0).sum()}")
    print("\n    Sample Chronological Windows (First 10):")
    for win, row in window_summary.head(10).iterrows():
        print(f"      {win} | Total: {row['total_flows']:4d} | Malicious: {row['attack_flows']:4d} | Labels: {row['labels'][:2]}")

    print("\n" + "=" * 80)
    print("INSPECTION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    inspect_dataset("data/raw/ctu13_scenario5.binetflow")
