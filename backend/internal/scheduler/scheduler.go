package scheduler

import (
	"time"

	"github.com/hughstanway/speedtest/backend/internal/config"
	"github.com/hughstanway/speedtest/backend/internal/database"
	"github.com/hughstanway/speedtest/backend/internal/logger"
	"github.com/hughstanway/speedtest/backend/internal/speedtest"
	"github.com/hughstanway/speedtest/backend/internal/websocket"
)

// Scheduler runs speed tests automatically at a configurable interval.
// It reloads its configuration only when signalled via cfg.Changed (event-driven).
type Scheduler struct {
	cfg    *config.Store
	db     *database.DB
	engine *speedtest.Engine
	hub    *websocket.Hub
}

// NewScheduler creates a new Scheduler.
func NewScheduler(db *database.DB, engine *speedtest.Engine, hub *websocket.Hub, cfg *config.Store) *Scheduler {
	return &Scheduler{db: db, engine: engine, hub: hub, cfg: cfg}
}

// Run starts the scheduler loop. This should be called in a goroutine.
// It exits only if the process shuts down.
func (s *Scheduler) Run() {
	snap := s.cfg.Get()
	timer := time.NewTimer(s.nextTrigger(snap))

	for {
		select {
		case <-timer.C:
			snap = s.cfg.Get()
			if snap.ScheduleEnabled {
				s.runTest()
				s.prune(snap)
			}
			timer.Reset(s.nextTrigger(snap))

		case <-s.cfg.Changed:
			snap = s.cfg.Get()
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(s.nextTrigger(snap))
			logger.Info("scheduler", "config reloaded",
				"enabled", snap.ScheduleEnabled,
				"mode", snap.ScheduleMode,
				"interval", snap.ScheduleInterval,
				"time", snap.ScheduleTime,
			)
		}
	}
}

func (s *Scheduler) nextTrigger(snap config.Settings) time.Duration {
	if !snap.ScheduleEnabled {
		return 24 * time.Hour // Sleep until changed
	}

	if snap.ScheduleMode == "daily" {
		t, err := time.Parse("15:04", snap.ScheduleTime)
		if err != nil {
			logger.Warn("scheduler", "invalid schedule_time", "time", snap.ScheduleTime, "error", err)
			return time.Hour
		}

		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location())
		if next.Before(now) {
			next = next.Add(24 * time.Hour)
		}
		return next.Sub(now)
	}

	// Default: interval mode
	if snap.ScheduleInterval <= 0 {
		return time.Hour
	}
	return time.Duration(snap.ScheduleInterval) * time.Second
}

func (s *Scheduler) runTest() {
	if s.engine.IsRunning() {
		logger.Info("scheduler", "test skipped - already running")
		return
	}

	logger.Info("scheduler", "event=scheduled_test_start")
	res, err := s.engine.Run(s.hub)
	if err != nil {
		logger.Error("scheduler", "test failed", "error", err)
		return
	}

	res.IsScheduled = true
	if err := s.db.SaveResult(res); err != nil {
		logger.Error("scheduler", "failed to save result", "error", err)
	} else {
		logger.Info("scheduler", "event=scheduled_test_finished", "id", res.ID)
	}
}

func (s *Scheduler) prune(snap config.Settings) {
	if snap.RetentionSeconds <= 0 {
		return
	}
	removed, err := s.db.PruneOlderThan(snap.RetentionSeconds)
	if err != nil {
		logger.Error("cleanup-thread", "failed to prune old results", "error", err)
		return
	}

	logger.Info("cleanup-thread", "event=idle_ip_cleanup_finished", "removed", removed)
}
