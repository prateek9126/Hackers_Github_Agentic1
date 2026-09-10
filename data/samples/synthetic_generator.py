"""
Synthetic Network Traffic Generator for Testing & Validation.
NOTE: This script generates SYNTHETIC test data only (clearly labeled).
Simulates a multi-stage attack kill chain across 10 chronological time windows (60s each):
Normal -> Scanning -> Credential Access -> Lateral Movement -> Exfiltration.
"""

from datetime import datetime, timezone, timedelta
import random
import os
import pandas as pd


def generate_synthetic_traffic(
    output_csv_path: str = "data/samples/synthetic_traffic.csv",
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generates synthetic network flows simulating a chronological 10-minute intrusion lifecycle.
    """
    random.seed(seed)
    base_time = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    records = []

    # 1. Windows 0..1 (0 - 120s): BENIGN Baseline Traffic
    for sec in range(0, 120, 2):
        ts = base_time + timedelta(seconds=sec + random.uniform(0, 1.5))
        records.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "flow_duration": random.uniform(0.1, 5.0),
            "src_ip": f"192.168.1.{random.randint(10, 25)}",
            "dst_ip": "10.0.0.1" if random.random() > 0.3 else "8.8.8.8",
            "src_port": random.randint(30000, 60000),
            "dst_port": random.choice([80, 443, 53]),
            "protocol": "TCP" if random.random() > 0.2 else "UDP",
            "total_fwd_packets": random.randint(5, 20),
            "total_backward_packets": random.randint(5, 25),
            "total_length_of_fwd_packets": random.randint(300, 2500),
            "total_length_of_bwd_packets": random.randint(500, 8000),
            "syn_flag_count": 1,
            "ack_flag_count": 1,
            "fin_flag_count": 1,
            "rst_flag_count": 0,
            "psh_flag_count": random.randint(1, 4),
            "urg_flag_count": 0,
            "packet_length_mean": random.uniform(80.0, 450.0),
            "packet_length_std": random.uniform(20.0, 150.0),
            "flow_iat_mean": random.uniform(0.01, 0.2),
            "flow_iat_std": random.uniform(0.005, 0.05),
            "conn_state": "SF",
            "label": "BENIGN",
        })

    # 2. Windows 2..3 (120 - 240s): RECONNAISSANCE & SCANNING (Port Scan)
    attacker_ip = "192.168.1.150"
    target_subnet = "10.0.0."
    ports_to_scan = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 8080]

    for sec in range(120, 240, 1):
        ts = base_time + timedelta(seconds=sec + random.uniform(0, 0.8))
        target_ip = f"{target_subnet}{random.randint(1, 10)}"
        dst_p = random.choice(ports_to_scan)

        # High SYN, no ACK, failed connections
        records.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "flow_duration": random.uniform(0.01, 0.1),
            "src_ip": attacker_ip,
            "dst_ip": target_ip,
            "src_port": random.randint(40000, 65000),
            "dst_port": dst_p,
            "protocol": "TCP",
            "total_fwd_packets": 2,
            "total_backward_packets": 0 if random.random() > 0.2 else 1,
            "total_length_of_fwd_packets": 80,
            "total_length_of_bwd_packets": 0,
            "syn_flag_count": 2,
            "ack_flag_count": 0,
            "fin_flag_count": 0,
            "rst_flag_count": 1 if random.random() > 0.4 else 0,
            "psh_flag_count": 0,
            "urg_flag_count": 0,
            "packet_length_mean": 40.0,
            "packet_length_std": 0.0,
            "flow_iat_mean": 0.005,
            "flow_iat_std": 0.001,
            "conn_state": "REJ" if random.random() > 0.3 else "S0",
            "label": "PortScan",
        })

    # 3. Windows 4..5 (240 - 360s): CREDENTIAL_ACCESS (SSH / Web Brute Force)
    target_server = "10.0.0.5"
    for sec in range(240, 360, 1):
        ts = base_time + timedelta(seconds=sec + random.uniform(0, 0.5))
        records.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "flow_duration": random.uniform(0.2, 0.8),
            "src_ip": attacker_ip,
            "dst_ip": target_server,
            "src_port": random.randint(40000, 60000),
            "dst_port": 22,
            "protocol": "TCP",
            "total_fwd_packets": random.randint(8, 15),
            "total_backward_packets": random.randint(6, 12),
            "total_length_of_fwd_packets": random.randint(400, 900),
            "total_length_of_bwd_packets": random.randint(350, 700),
            "syn_flag_count": 1,
            "ack_flag_count": 1,
            "fin_flag_count": 1,
            "rst_flag_count": 1,
            "psh_flag_count": random.randint(2, 5),
            "urg_flag_count": 0,
            "packet_length_mean": 65.0,
            "packet_length_std": 15.0,
            "flow_iat_mean": 0.02,
            "flow_iat_std": 0.01,
            "conn_state": "RSTO",
            "label": "SSH-Patator",
        })

    # 4. Windows 6..7 (360 - 480s): LATERAL MOVEMENT (Internal SMB/RDP)
    compromised_server = "10.0.0.5"
    domain_controller = "10.0.0.2"
    for sec in range(360, 480, 2):
        ts = base_time + timedelta(seconds=sec + random.uniform(0, 1.2))
        records.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "flow_duration": random.uniform(0.5, 3.0),
            "src_ip": compromised_server,
            "dst_ip": domain_controller,
            "src_port": random.randint(49000, 55000),
            "dst_port": 445,
            "protocol": "TCP",
            "total_fwd_packets": random.randint(15, 35),
            "total_backward_packets": random.randint(12, 30),
            "total_length_of_fwd_packets": random.randint(1200, 4000),
            "total_length_of_bwd_packets": random.randint(1000, 3000),
            "syn_flag_count": 1,
            "ack_flag_count": 1,
            "fin_flag_count": 1,
            "rst_flag_count": 0,
            "psh_flag_count": random.randint(4, 10),
            "urg_flag_count": 0,
            "packet_length_mean": 110.0,
            "packet_length_std": 45.0,
            "flow_iat_mean": 0.05,
            "flow_iat_std": 0.02,
            "conn_state": "SF",
            "label": "Infiltration",
        })

    # 5. Windows 8..9 (480 - 600s): COMMAND & CONTROL + EXFILTRATION
    c2_server = "203.0.113.88"
    for sec in range(480, 600, 1):
        ts = base_time + timedelta(seconds=sec + random.uniform(0, 0.4))
        # High outbound payload volume, strong byte asymmetry
        records.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "flow_duration": random.uniform(1.0, 8.0),
            "src_ip": compromised_server,
            "dst_ip": c2_server,
            "src_port": random.randint(50000, 60000),
            "dst_port": 8443,
            "protocol": "TCP",
            "total_fwd_packets": random.randint(50, 150),
            "total_backward_packets": random.randint(10, 20),
            "total_length_of_fwd_packets": random.randint(45000, 180000),
            "total_length_of_bwd_packets": random.randint(600, 1200),
            "syn_flag_count": 1,
            "ack_flag_count": 1,
            "fin_flag_count": 1,
            "rst_flag_count": 0,
            "psh_flag_count": random.randint(15, 45),
            "urg_flag_count": 0,
            "packet_length_mean": 1150.0,
            "packet_length_std": 250.0,
            "flow_iat_mean": 0.01,
            "flow_iat_std": 0.005,
            "conn_state": "SF",
            "label": "Bot",
        })

    df = pd.DataFrame(records)
    # Ensure strictly sorted by timestamp
    df["dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by="dt").drop(columns=["dt"])

    # Ensure target output directory exists
    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df.to_csv(output_csv_path, index=False)
    print(f"Generated {len(df)} synthetic traffic records saved to: {output_csv_path}")
    return df


if __name__ == "__main__":
    generate_synthetic_traffic()
