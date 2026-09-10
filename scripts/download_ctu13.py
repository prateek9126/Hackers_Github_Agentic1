"""
Download CTU-13 Scenario 5 (Virut botnet, 16.9 MB) for SIH26153 Phase 3.
Source: Stratosphere Laboratory / Czech Technical University (CTU)
URL: https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-46/detailed-bidirectional-flow-labels/capture20110815-2.binetflow
"""
import os
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DEST_PATH = "data/raw/ctu13_scenario5.binetflow"
URL = "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-46/detailed-bidirectional-flow-labels/capture20110815-2.binetflow"

def download_dataset():
    if os.path.exists(DEST_PATH) and os.path.getsize(DEST_PATH) > 10 * 1024 * 1024:
        print(f"Dataset already exists at: {DEST_PATH} ({os.path.getsize(DEST_PATH)/(1024*1024):.1f} MB)")
        return

    os.makedirs(os.path.dirname(DEST_PATH), exist_ok=True)
    print(f"Downloading CTU-13 Scenario 5 from: {URL} ...")
    r = requests.get(URL, stream=True, verify=False, timeout=30)
    r.raise_for_status()

    total_downloaded = 0
    with open(DEST_PATH, "wb") as f:
        for chunk in r.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
                total_downloaded += len(chunk)
                if total_downloaded % (2 * 1024 * 1024) < 65536:
                    print(f"Downloaded {total_downloaded / (1024 * 1024):.1f} MB...")

    print(f"Download complete: {DEST_PATH} ({os.path.getsize(DEST_PATH)/(1024*1024):.1f} MB)")

if __name__ == "__main__":
    download_dataset()
