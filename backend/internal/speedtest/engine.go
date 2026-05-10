package speedtest

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"sync/atomic"
	"time"

	"github.com/hughstanway/speedtest/backend/internal/logger"
	"github.com/hughstanway/speedtest/backend/internal/models"
)

type Engine struct {
	binaryPath string
	isRunning  atomic.Bool
}

func NewEngine(binaryPath string) *Engine {
	return &Engine{
		binaryPath: binaryPath,
	}
}

func (e *Engine) IsRunning() bool {
	return e.isRunning.Load()
}

type ooklaResult struct {
	Timestamp string `json:"timestamp"`
	Ping      struct {
		Jitter  float64 `json:"jitter"`
		Latency float64 `json:"latency"`
	} `json:"ping"`
	Download struct {
		Bandwidth int64 `json:"bandwidth"`
	} `json:"download"`
	Upload struct {
		Bandwidth int64 `json:"bandwidth"`
	} `json:"upload"`
	PacketLoss float64 `json:"packetLoss"`
	ISP        string  `json:"isp"`
	Interface  struct {
		ExternalIP string `json:"externalIp"`
	} `json:"interface"`
	Server struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		Location string `json:"location"`
	} `json:"server"`
}

type Broadcaster interface {
	Broadcast(v interface{})
}

func (e *Engine) Run(b Broadcaster) (*models.Result, error) {
	if !e.isRunning.CompareAndSwap(false, true) {
		return nil, fmt.Errorf("speedtest is already running")
	}
	logger.Info("engine", "test started")
	defer func() {
		e.isRunning.Store(false)
		logger.Info("engine", "test finished")
	}()

	cmd := exec.Command(e.binaryPath, "--accept-license", "--accept-gdpr", "--format=jsonl")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start speedtest: %w", err)
	}

	// Capture stderr for better error reporting
	stderrBytes := make([]byte, 1024)
	go func() {
		n, _ := stderr.Read(stderrBytes)
		if n > 0 {
			stderrBytes = stderrBytes[:n]
		} else {
			stderrBytes = nil
		}
	}()

	decoder := json.NewDecoder(stdout)
	var finalResult *models.Result

	for decoder.More() {
		var msg map[string]interface{}
		if err := decoder.Decode(&msg); err != nil {
			continue
		}

		// Broadcast raw message to all WS clients
		if b != nil {
			b.Broadcast(msg)
		}

		// If it's the final result, parse it into our model
		if msg["type"] == "result" {
			data, _ := json.Marshal(msg)
			var raw ooklaResult
			if err := json.Unmarshal(data, &raw); err == nil {
				timestamp, _ := time.Parse(time.RFC3339, raw.Timestamp)
				finalResult = &models.Result{
					Timestamp:    timestamp,
					DownloadMbps: float64(raw.Download.Bandwidth*8) / 1_000_000,
					UploadMbps:   float64(raw.Upload.Bandwidth*8) / 1_000_000,
					PingMs:       raw.Ping.Latency,
					JitterMs:     raw.Ping.Jitter,
					PacketLoss:   raw.PacketLoss,
					ISP:          raw.ISP,
					ServerID:     raw.Server.ID,
					ServerName:   fmt.Sprintf("%s (%s)", raw.Server.Name, raw.Server.Location),
					ExternalIP:   raw.Interface.ExternalIP,
				}
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("speedtest failed: %w (stderr: %s)", err, string(stderrBytes))
	}

	if finalResult == nil {
		return nil, fmt.Errorf("no result found in speedtest output")
	}

	return finalResult, nil
}
