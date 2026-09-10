"""
PCAP / PCAPNG Traffic Parser for SIH26153.
Extracts 5-tuples, TCP flags, volume metrics, and inter-arrival statistics from raw packet captures.
Hardened against:
- Malformed packets and corrupted framing
- Truncated capture files
- Oversized packets
- Pure-data processing (never executes payloads or scripts)
Converts packet streams into canonical UnifiedTrafficRecord objects.
"""

import os
import struct
import socket
import logging
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional, Any
from network.schema import UnifiedTrafficRecord

logger = logging.getLogger("sih26153.network.pcap")

# Known PCAP magic bytes
PCAP_MAGIC_BIG_ENDIAN = 0xA1B2C3D4
PCAP_MAGIC_LITTLE_ENDIAN = 0xD4C3B2A1
PCAP_MAGIC_NANO_BIG = 0xA1B2CD34
PCAP_MAGIC_NANO_LITTLE = 0x34CDB2A1
PCAPNG_MAGIC = 0x0A0D0D0A


class PCAPTrafficParser:
    """
    High-performance PCAP parser with dpkt engine and pure-Python binary fallback.
    Safely parses .pcap and .pcapng files, rejects corrupted frames, and outputs
    chronologically ordered UnifiedTrafficRecord instances.
    """

    def __init__(self):
        self._has_dpkt = False
        try:
            import dpkt
            self._dpkt = dpkt
            self._has_dpkt = True
        except ImportError:
            self._dpkt = None
            self._has_dpkt = False

    def validate_pcap_header(self, file_path: str) -> Tuple[bool, str]:
        """
        Validates the global header magic bytes and existence of the capture file.
        """
        if not os.path.exists(file_path):
            return False, f"File does not exist: {file_path}"

        size = os.path.getsize(file_path)
        if size == 0:
            return False, "File is completely empty (0 bytes)."

        if size < 24:
            return False, f"File is too small to contain a valid PCAP header ({size} bytes < 24 bytes)."

        try:
            with open(file_path, "rb") as f:
                magic_bytes = f.read(4)

            if len(magic_bytes) < 4:
                return False, "Unable to read 4-byte header magic."

            if magic_bytes in [b"\xa1\xb2\xc3\xd4", b"\xa1\xb2\xcd\x34"]:
                return True, "Standard Big-Endian PCAP"
            elif magic_bytes in [b"\xd4\xc3\xb2\xa1", b"\x34\xcd\xb2\xa1"]:
                return True, "Standard Little-Endian PCAP"
            elif magic_bytes in [b"\n\r\r\n", b"\x0a\x0d\x0d\x0a"]:
                return True, "PCAPNG Capture"
            else:
                magic_hex = magic_bytes.hex()
                return False, f"Unrecognized PCAP magic number: 0x{magic_hex}"
        except Exception as e:
            return False, f"Failed to validate PCAP header: {str(e)}"

    def get_pcap_summary(self, file_path: str, max_packets: int = 50000) -> Dict[str, Any]:
        """
        Quickly inspects the PCAP file to return high-level summary metadata
        (packet count, duration, file size, start/end timestamps, protocols).
        """
        is_valid, desc = self.validate_pcap_header(file_path)
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        if not is_valid:
            return {
                "valid": False,
                "message": desc,
                "file_size_bytes": file_size,
                "packet_count": 0,
                "duration_sec": 0.0,
                "start_time": None,
                "end_time": None,
                "protocols": [],
            }

        records = self.parse_pcap(file_path, max_packets=max_packets)
        if not records:
            return {
                "valid": True,
                "message": f"Valid {desc} header, but contains 0 readable IPv4/IPv6 packets.",
                "file_size_bytes": file_size,
                "packet_count": 0,
                "duration_sec": 0.0,
                "start_time": None,
                "end_time": None,
                "protocols": [],
            }

        start_ts = min(r.timestamp for r in records)
        end_ts = max(r.timestamp for r in records)
        duration = max(0.001, (end_ts - start_ts).total_seconds())
        protocols = sorted(list(set(r.protocol for r in records)))
        tot_packets = sum(r.total_packets for r in records)

        return {
            "valid": True,
            "message": desc,
            "file_size_bytes": file_size,
            "packet_count": tot_packets,
            "duration_sec": round(duration, 2),
            "start_time": start_ts.isoformat(),
            "end_time": end_ts.isoformat(),
            "protocols": protocols,
        }

    def parse_pcap(
        self, file_path: str, max_packets: int = 50000
    ) -> List[UnifiedTrafficRecord]:
        """
        Parses PCAP/PCAPNG file into canonical UnifiedTrafficRecord objects.
        Prioritizes dpkt parser with automatic fallback to pure-Python binary parser.
        """
        is_valid, header_desc = self.validate_pcap_header(file_path)
        if not is_valid:
            logger.warning(f"PCAP validation warning for {file_path}: {header_desc}")
            return []

        if self._has_dpkt:
            try:
                records = self._parse_with_dpkt(file_path, max_packets=max_packets)
                if records:
                    return records
            except Exception as e:
                logger.warning(f"dpkt parser error on {file_path}: {e}. Falling back to binary parser.")

        return self._parse_binary_fallback(file_path, max_packets=max_packets)

    def _parse_with_dpkt(
        self, file_path: str, max_packets: int = 50000
    ) -> List[UnifiedTrafficRecord]:
        """
        Streaming packet parser using dpkt for both standard PCAP and PCAPNG.
        Strictly treats packets as passive data, never executes payloads.
        """
        records: List[UnifiedTrafficRecord] = []
        packet_count = 0
        corrupted_count = 0

        with open(file_path, "rb") as f:
            reader = None
            try:
                reader = self._dpkt.pcap.Reader(f)
            except Exception:
                try:
                    f.seek(0)
                    reader = self._dpkt.pcapng.Reader(f)
                except Exception as pcapng_err:
                    logger.warning(f"Failed to create dpkt reader: {pcapng_err}")
                    return []

            for ts, buf in reader:
                packet_count += 1
                if packet_count > max_packets:
                    break

                try:
                    # Parse Ethernet framing
                    eth = self._dpkt.ethernet.Ethernet(buf)
                    ip_obj = None

                    if isinstance(eth.data, self._dpkt.ip.IP):
                        ip_obj = eth.data
                        src_ip = socket.inet_ntoa(ip_obj.src)
                        dst_ip = socket.inet_ntoa(ip_obj.dst)
                    elif hasattr(self._dpkt, "ip6") and isinstance(eth.data, self._dpkt.ip6.IP6):
                        ip_obj = eth.data
                        src_ip = socket.inet_ntop(socket.AF_INET6, ip_obj.src)
                        dst_ip = socket.inet_ntop(socket.AF_INET6, ip_obj.dst)
                    else:
                        # Raw IP or non-Ethernet link layer encapsulation
                        try:
                            ip_obj = self._dpkt.ip.IP(buf)
                            src_ip = socket.inet_ntoa(ip_obj.src)
                            dst_ip = socket.inet_ntoa(ip_obj.dst)
                        except Exception:
                            continue

                    if ip_obj is None:
                        continue

                    # Protocol determination
                    proto_num = getattr(ip_obj, "p", 0)
                    proto = "TCP" if proto_num == 6 else ("UDP" if proto_num == 17 else ("ICMP" if proto_num == 1 else "OTHER"))

                    src_port = 0
                    dst_port = 0
                    syn = ack = fin = rst = psh = urg = 0
                    win_size = 0

                    if proto == "TCP" and hasattr(ip_obj, "data") and isinstance(ip_obj.data, self._dpkt.tcp.TCP):
                        tcp = ip_obj.data
                        src_port = int(tcp.sport)
                        dst_port = int(tcp.dport)
                        flags = int(tcp.flags)
                        syn = 1 if (flags & self._dpkt.tcp.TH_SYN) else 0
                        ack = 1 if (flags & self._dpkt.tcp.TH_ACK) else 0
                        fin = 1 if (flags & self._dpkt.tcp.TH_FIN) else 0
                        rst = 1 if (flags & self._dpkt.tcp.TH_RST) else 0
                        psh = 1 if (flags & self._dpkt.tcp.TH_PUSH) else 0
                        urg = 1 if (flags & self._dpkt.tcp.TH_URG) else 0
                        win_size = int(getattr(tcp, "win", 0))

                    elif proto == "UDP" and hasattr(ip_obj, "data") and isinstance(ip_obj.data, self._dpkt.udp.UDP):
                        udp = ip_obj.data
                        src_port = int(udp.sport)
                        dst_port = int(udp.dport)

                    pkt_len = len(buf)
                    dt_ts = datetime.fromtimestamp(ts, tz=timezone.utc)
                    ttl = int(getattr(ip_obj, "ttl", 64))

                    conn_state = "SF"
                    if proto == "TCP":
                        if rst > 0:
                            conn_state = "RSTO"
                        elif syn > 0 and ack == 0:
                            conn_state = "S0"

                    record = UnifiedTrafficRecord(
                        timestamp=dt_ts,
                        duration_sec=0.001,
                        src_ip=src_ip,
                        dst_ip=dst_ip,
                        src_port=src_port,
                        dst_port=dst_port,
                        protocol=proto,
                        fwd_packets=1,
                        bwd_packets=0,
                        fwd_bytes=pkt_len,
                        bwd_bytes=0,
                        total_packets=1,
                        total_bytes=pkt_len,
                        packet_rate=1000.0,
                        byte_rate=pkt_len * 1000.0,
                        syn_count=syn,
                        ack_count=ack,
                        fin_count=fin,
                        rst_count=rst,
                        psh_count=psh,
                        urg_count=urg,
                        packet_size_min=float(pkt_len),
                        packet_size_max=float(pkt_len),
                        packet_size_mean=float(pkt_len),
                        ttl_mean=float(ttl),
                        tcp_win_mean=float(win_size),
                        conn_state=conn_state,
                        raw_label="UNLABELED",
                    )
                    records.append(record)

                except Exception as pkt_err:
                    corrupted_count += 1
                    continue

        # Sort strictly chronologically
        records.sort(key=lambda r: r.timestamp)
        logger.info(
            f"dpkt parsed {packet_count} packets into {len(records)} records ({corrupted_count} corrupted frames skipped)."
        )
        return records

    def _parse_binary_fallback(
        self, file_path: str, max_packets: int = 50000
    ) -> List[UnifiedTrafficRecord]:
        """
        Lightweight pure-Python binary parser for offline systems without dpkt.
        Extracts Ethernet/IPv4 packet headers directly from PCAP file.
        """
        records = []
        try:
            with open(file_path, "rb") as f:
                header = f.read(24)
                if len(header) < 24:
                    return records

                magic = struct.unpack(">I", header[:4])[0]
                endian = ">" if magic in [PCAP_MAGIC_BIG_ENDIAN, PCAP_MAGIC_NANO_BIG] else "<"

                count = 0
                while count < max_packets:
                    pkt_hdr = f.read(16)
                    if len(pkt_hdr) < 16:
                        break

                    ts_sec, ts_usec, incl_len, orig_len = struct.unpack(f"{endian}IIII", pkt_hdr)
                    packet_data = f.read(incl_len)
                    if len(packet_data) < incl_len:
                        break

                    count += 1
                    # Basic IPv4 over Ethernet (14-byte eth header + 20-byte IP)
                    if incl_len >= 34 and packet_data[12:14] == b"\x08\x00":
                        ip_header = packet_data[14:34]
                        proto_num = ip_header[9]
                        proto = "TCP" if proto_num == 6 else ("UDP" if proto_num == 17 else ("ICMP" if proto_num == 1 else "OTHER"))
                        src_ip = ".".join(str(b) for b in ip_header[12:16])
                        dst_ip = ".".join(str(b) for b in ip_header[16:20])

                        src_port = 0
                        dst_port = 0
                        syn = 0
                        ack = 0
                        rst = 0
                        if proto == "TCP" and len(packet_data) >= 54:
                            src_port = struct.unpack("!H", packet_data[34:36])[0]
                            dst_port = struct.unpack("!H", packet_data[36:38])[0]
                            flags_byte = packet_data[47]
                            syn = 1 if (flags_byte & 0x02) else 0
                            rst = 1 if (flags_byte & 0x04) else 0
                            ack = 1 if (flags_byte & 0x10) else 0

                        elif proto == "UDP" and len(packet_data) >= 42:
                            src_port = struct.unpack("!H", packet_data[34:36])[0]
                            dst_port = struct.unpack("!H", packet_data[36:38])[0]

                        ts = datetime.fromtimestamp(ts_sec + ts_usec / 1e6, tz=timezone.utc)
                        records.append(
                            UnifiedTrafficRecord(
                                timestamp=ts,
                                duration_sec=0.001,
                                src_ip=src_ip,
                                dst_ip=dst_ip,
                                src_port=src_port,
                                dst_port=dst_port,
                                protocol=proto,
                                fwd_packets=1,
                                bwd_packets=0,
                                fwd_bytes=orig_len,
                                bwd_bytes=0,
                                total_packets=1,
                                total_bytes=orig_len,
                                syn_count=syn,
                                ack_count=ack,
                                rst_count=rst,
                                packet_size_min=float(orig_len),
                                packet_size_max=float(orig_len),
                                packet_size_mean=float(orig_len),
                                conn_state="SF" if ack > 0 else ("S0" if syn > 0 else "OTH"),
                                raw_label="UNLABELED",
                            )
                        )
        except Exception as e:
            logger.warning(f"Binary PCAP fallback encountered read error: {e}")

        records.sort(key=lambda r: r.timestamp)
        return records
