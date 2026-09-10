import requests
import re
import urllib3
urllib3.disable_warnings()

res = requests.get('https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-42/detailed-bidirectional-flow-labels/', verify=False)
hrefs = re.findall(r'href=[\'"]([^\'"]+)[\'"]', res.text)
print("Files in detailed-bidirectional-flow-labels:")
for h in hrefs[:30]:
    print(" -", h)
