import requests
import urllib3
urllib3.disable_warnings()

base = "https://mcfp.felk.cvut.cz/publicDatasets/"
scenarios = [
    ("Scenario 1 (Neris)", "CTU-Malware-Capture-Botnet-42/detailed-bidirectional-flow-labels/capture20110810.binetflow"),
    ("Scenario 2 (Neris)", "CTU-Malware-Capture-Botnet-43/detailed-bidirectional-flow-labels/capture20110811.binetflow"),
    ("Scenario 3 (Rbot)", "CTU-Malware-Capture-Botnet-44/detailed-bidirectional-flow-labels/capture20110812.binetflow"),
    ("Scenario 4 (Rbot)", "CTU-Malware-Capture-Botnet-45/detailed-bidirectional-flow-labels/capture20110815.binetflow"),
    ("Scenario 5 (Virut)", "CTU-Malware-Capture-Botnet-46/detailed-bidirectional-flow-labels/capture20110815-2.binetflow"),
    ("Scenario 6 (Menti)", "CTU-Malware-Capture-Botnet-47/detailed-bidirectional-flow-labels/capture20110816.binetflow"),
    ("Scenario 7 (Sogou)", "CTU-Malware-Capture-Botnet-48/detailed-bidirectional-flow-labels/capture20110816-3.binetflow"),
    ("Scenario 8 (Murlo)", "CTU-Malware-Capture-Botnet-49/detailed-bidirectional-flow-labels/capture20110816-2.binetflow"),
    ("Scenario 9 (Neris)", "CTU-Malware-Capture-Botnet-50/detailed-bidirectional-flow-labels/capture20110817.binetflow"),
    ("Scenario 10 (Rbot)", "CTU-Malware-Capture-Botnet-51/detailed-bidirectional-flow-labels/capture20110818.binetflow"),
]

for name, path in scenarios:
    try:
        r = requests.head(base + path, verify=False, timeout=5)
        size_mb = int(r.headers.get('content-length', 0)) / (1024 * 1024)
        print(f"{name:20s}: {size_mb:6.1f} MB | status: {r.status_code}")
    except Exception as e:
        print(f"{name:20s}: error {e}")
