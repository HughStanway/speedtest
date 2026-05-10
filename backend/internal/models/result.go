package models

import "time"

type Result struct {
	ID           int64     `json:"id"`
	Timestamp    time.Time `json:"timestamp"`
	DownloadMbps float64   `json:"download_mbps"`
	UploadMbps   float64   `json:"upload_mbps"`
	PingMs       float64   `json:"ping_ms"`
	JitterMs     float64   `json:"jitter_ms"`
	PacketLoss   float64   `json:"packet_loss"`
	ISP          string    `json:"isp"`
	ServerID     int       `json:"server_id"`
	ServerName   string    `json:"server_name"`
	ExternalIP   string    `json:"external_ip"`
	IsScheduled  bool      `json:"is_scheduled"`
}
