package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hughstanway/speedtest/backend/internal/config"
	"github.com/hughstanway/speedtest/backend/internal/database"
	"github.com/hughstanway/speedtest/backend/internal/logger"
	"github.com/hughstanway/speedtest/backend/internal/models"
	"github.com/hughstanway/speedtest/backend/internal/speedtest"
	"github.com/hughstanway/speedtest/backend/internal/websocket"
)

type Server struct {
	db     *database.DB
	engine *speedtest.Engine
	hub    *websocket.Hub
	cfg    *config.Store
}

func NewServer(db *database.DB, engine *speedtest.Engine, hub *websocket.Hub, cfg *config.Store) *Server {
	return &Server{
		db:     db,
		engine: engine,
		hub:    hub,
		cfg:    cfg,
	}
}

func (s *Server) GetLatest(c *gin.Context) {
	res, err := s.db.GetLatestResult()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if res == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "no results found"})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (s *Server) GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"running": s.engine.IsRunning(),
	})
}

func (s *Server) RunTest(c *gin.Context) {
	if s.engine.IsRunning() {
		c.JSON(http.StatusConflict, gin.H{"error": "speedtest is already running"})
		return
	}

	// Run in background
	go func() {
		res, err := s.engine.Run(s.hub)
		if err != nil {
			logger.Error("api", "test failed", "error", err)
			return
		}

		res.IsScheduled = false
		if err := s.db.SaveResult(res); err != nil {
			logger.Error("api", "failed to save result", "error", err)
		} else {
			logger.Info("api", "event=manual_test_finished", "id", res.ID)
			// Notify frontend that data is ready to be fetched
			if s.hub != nil {
				s.hub.Broadcast(map[string]interface{}{
					"type": "saveComplete",
				})
			}
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{"status": "started"})
}

func (s *Server) GetHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)

	results, err := s.db.GetHistory(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if results == nil {
		results = []models.Result{} // Return empty array instead of null
	}

	c.JSON(http.StatusOK, results)
}

// ── Settings ──

func (s *Server) GetSettings(c *gin.Context) {
	c.JSON(http.StatusOK, s.cfg.Get())
}

type updateSettingsRequest struct {
	ScheduleEnabled  *bool   `json:"schedule_enabled"`
	ScheduleMode     *string `json:"schedule_mode"`
	ScheduleInterval *int64  `json:"schedule_interval"`
	ScheduleTime     *string `json:"schedule_time"`
	RetentionSeconds *int64  `json:"retention_seconds"`
}

func (s *Server) UpdateSettings(c *gin.Context) {
	var req updateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	partial := config.Settings{}
	mask := config.SettingsMask{}

	if req.ScheduleEnabled != nil {
		partial.ScheduleEnabled = *req.ScheduleEnabled
		mask.ScheduleEnabled = true
	}
	if req.ScheduleMode != nil {
		if *req.ScheduleMode != "interval" && *req.ScheduleMode != "daily" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid schedule_mode (must be 'interval' or 'daily')"})
			return
		}
		partial.ScheduleMode = *req.ScheduleMode
		mask.ScheduleMode = true
	}
	if req.ScheduleInterval != nil {
		if *req.ScheduleInterval < 60 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "schedule_interval must be >= 60 seconds"})
			return
		}
		partial.ScheduleInterval = *req.ScheduleInterval
		mask.ScheduleInterval = true
	}
	if req.ScheduleTime != nil {
		partial.ScheduleTime = *req.ScheduleTime
		mask.ScheduleTime = true
	}
	if req.RetentionSeconds != nil {
		if *req.RetentionSeconds < 3600 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "retention_seconds must be >= 3600 (1 hour)"})
			return
		}
		partial.RetentionSeconds = *req.RetentionSeconds
		mask.RetentionSeconds = true
	}

	s.cfg.Update(partial, mask)
	logger.Info("api", "event=settings_updated")
	c.JSON(http.StatusOK, s.cfg.Get())
}
