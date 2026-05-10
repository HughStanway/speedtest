package config

import (
	"os"
	"strconv"
	"sync"
)

// Settings holds the runtime-mutable configuration.
type Settings struct {
	ScheduleEnabled  bool   `json:"schedule_enabled"`
	ScheduleMode     string `json:"schedule_mode"`     // "interval" or "daily"
	ScheduleInterval int64  `json:"schedule_interval"` // seconds
	ScheduleTime     string `json:"schedule_time"`     // "HH:mm"
	RetentionSeconds int64  `json:"retention_seconds"` // seconds
}

// Store is a thread-safe, signal-driven configuration store.
// Consumers subscribe to changes via the Changed channel.
type Store struct {
	mu       sync.RWMutex
	settings Settings
	// Changed is signalled (non-blocking) whenever settings are updated.
	Changed chan struct{}
}

// NewStoreFromEnv creates a Store populated from environment variables.
func NewStoreFromEnv() *Store {
	s := &Store{
		Changed: make(chan struct{}, 1),
	}

	s.settings.ScheduleEnabled = envBool("SPEEDTEST_SCHEDULE_ENABLED", false)
	s.settings.ScheduleMode = envString("SPEEDTEST_SCHEDULE_MODE", "interval")
	s.settings.ScheduleInterval = envInt64("SPEEDTEST_SCHEDULE_INTERVAL", 3600)
	s.settings.ScheduleTime = envString("SPEEDTEST_SCHEDULE_TIME", "03:00")
	s.settings.RetentionSeconds = envInt64("SPEEDTEST_RETENTION", 604800) // 7 days

	return s
}

// Get returns a snapshot of the current settings.
func (s *Store) Get() Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.settings
}

// Update applies a partial update to the settings and notifies consumers.
func (s *Store) Update(partial Settings, mask SettingsMask) {
	s.mu.Lock()
	if mask.ScheduleEnabled {
		s.settings.ScheduleEnabled = partial.ScheduleEnabled
	}
	if mask.ScheduleMode {
		s.settings.ScheduleMode = partial.ScheduleMode
	}
	if mask.ScheduleInterval && partial.ScheduleInterval > 0 {
		s.settings.ScheduleInterval = partial.ScheduleInterval
	}
	if mask.ScheduleTime {
		s.settings.ScheduleTime = partial.ScheduleTime
	}
	if mask.RetentionSeconds && partial.RetentionSeconds > 0 {
		s.settings.RetentionSeconds = partial.RetentionSeconds
	}
	s.mu.Unlock()

	// Non-blocking signal to consumers.
	select {
	case s.Changed <- struct{}{}:
	default:
	}
}

// SettingsMask indicates which fields in a partial update should be applied.
type SettingsMask struct {
	ScheduleEnabled  bool
	ScheduleMode     bool
	ScheduleInterval bool
	ScheduleTime     bool
	RetentionSeconds bool
}

// ── helpers ──

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func envString(key string, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func envInt64(key string, fallback int64) int64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
