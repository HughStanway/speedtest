export interface SpeedtestResult {
  id: number;
  timestamp: string;
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  jitter_ms: number;
  packet_loss: number;
  isp: string;
  server_name: string;
  external_ip: string;
  is_scheduled: boolean;
}

export interface StatusResponse {
  running: boolean;
}
