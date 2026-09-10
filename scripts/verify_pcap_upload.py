import httpx

client = httpx.Client(timeout=10.0)

# 1. Check backend health
health = client.get('http://127.0.0.1:8000/api/health').json()
assert health['status'] == 'healthy'
print('[PASS] 1. Backend healthy')

# 2. Check frontend status
fe = client.get('http://localhost:3000/')
assert fe.status_code == 200
print('[PASS] 2. Frontend accessible: HTTP 200')

# 3. Test Demo/Synthetic mode works
syn_tl = client.get('http://127.0.0.1:8000/api/replay/timeline?scenario=synthetic').json()
assert syn_tl['total_steps'] == 10
assert syn_tl['has_ground_truth'] is True
print('[PASS] 3. Demo/Synthetic mode works (10 windows, ground truth present)')

# 4. Upload demo_attack_progression.pcap
with open('data/samples/demo_attack_progression.pcap', 'rb') as f:
    up_res = client.post('http://127.0.0.1:8000/api/pcap/upload', files={'file': ('demo_attack_progression.pcap', f, 'application/vnd.tcpdump.pcap')}, data={'window_duration_sec': 20.0}).json()

assert up_res['success'] is True
assert up_res['packet_count'] == 14
assert up_res['total_windows'] == 5
assert up_res['status'] == 'ANALYZED'
assert up_res['has_ground_truth'] is False
pcap_sc_id = up_res['scenario_id']
print('[PASS] 4. Uploaded PCAP parsed: 14 packets, 5 windows, status: ANALYZED')

# 5. Step 0 Replay on uploaded PCAP
step0 = client.post('http://127.0.0.1:8000/api/replay/step', json={'scenario_id': pcap_sc_id, 'step_index': 0, 'horizon': 5}).json()
assert step0['temporal_causality_verified'] is True
assert step0['future_ground_truth_withheld'] is True
assert step0['has_ground_truth'] is False
assert step0['current_state']['ground_truth_stage'] == 'UNAVAILABLE'
assert len(step0['forecast']['forecast']) == 5
print('[PASS] 5. Step 0 replay: causal, future withheld, ground truth UNAVAILABLE')

# 6. Step 2 Replay: advance forward
step2 = client.post('http://127.0.0.1:8000/api/replay/step', json={'scenario_id': pcap_sc_id, 'step_index': 2, 'horizon': 5}).json()
assert step2['step_index'] == 2
assert step2['current_state']['total_packets'] == 5
print('[PASS] 6. Step 2 replay: current state packets = 5 (genuine port probe traffic)')

# 7. Check MITRE mapping on uploaded PCAP
mitre = client.get('http://127.0.0.1:8000/api/mitre').json()
assert mitre['total_techniques'] >= 1
assert any(t['status'] == 'OBSERVED TECHNIQUE' for t in mitre['techniques'])
assert any(t['status'] == 'PREDICTED TECHNIQUE' for t in mitre['techniques'])
print('[PASS] 7. MITRE ATT&CK mapping active: distinguishing OBSERVED vs PREDICTED')

# 8. Check Defense Simulation on uploaded PCAP
sim = client.post('http://127.0.0.1:8000/api/simulate', json={'action_type': 'BLOCK_DESTINATION_PORT', 'target_entity': '80', 'horizon': 5}).json()
assert 'defense_action' in sim
assert 'simulated_forecast' in sim
assert 'disclaimer' in sim
print('[PASS] 8. What-If Defense Sandbox verified: counterfactual simulation computed')

# 9. Test Invalid PCAP upload (bad extension)
bad_ext = client.post('http://127.0.0.1:8000/api/pcap/upload', files={'file': ('payload.exe', b'bad content', 'application/octet-stream')})
assert bad_ext.status_code == 400
assert 'Unsupported file format' in bad_ext.json()['detail']
print('[PASS] 9. Bad extension rejected with clean 400 error')

# 10. Test Empty PCAP
empty_pcap = client.post('http://127.0.0.1:8000/api/pcap/upload', files={'file': ('empty.pcap', b'', 'application/octet-stream')})
assert empty_pcap.status_code == 400
print('[PASS] 10. Empty PCAP rejected with clean 400 error')

print('\n>>> ALL 10 VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<')
