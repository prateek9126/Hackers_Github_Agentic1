import requests
import urllib3
urllib3.disable_warnings()

url = "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-46/detailed-bidirectional-flow-labels/capture20110815-2.binetflow"
r = requests.get(url, stream=True, verify=False)
lines = []
for i, line in enumerate(r.iter_lines(decode_unicode=True)):
    if i > 20:
        break
    lines.append(line)

print("Header & Sample Lines from Scenario 5 (Virut):")
for l in lines:
    print(l)
