package main

import (
	"os"

	"github.com/gin-gonic/gin"
	"github.com/hughstanway/speedtest/backend/internal/api"
	"github.com/hughstanway/speedtest/backend/internal/config"
	"github.com/hughstanway/speedtest/backend/internal/database"
	"github.com/hughstanway/speedtest/backend/internal/logger"
	"github.com/hughstanway/speedtest/backend/internal/scheduler"
	"github.com/hughstanway/speedtest/backend/internal/speedtest"
	"github.com/hughstanway/speedtest/backend/internal/websocket"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/speedtest.db"
	}

	db, err := database.NewDB(dbPath)
	if err != nil {
		logger.Error("system", "failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	logger.Info("system", "database initialized")

	binaryPath := os.Getenv("SPEEDTEST_BINARY")
	if binaryPath == "" {
		binaryPath = "speedtest"
	}
	engine := speedtest.NewEngine(binaryPath)

	hub := websocket.NewHub()
	go hub.Run()

	cfg := config.NewStoreFromEnv()

	// Start the background scheduler
	sched := scheduler.NewScheduler(db, engine, hub, cfg)
	go sched.Run()

	snap := cfg.Get()
	logger.Info("system", "scheduler started",
		"enabled", snap.ScheduleEnabled,
		"interval", snap.ScheduleInterval,
		"retention", snap.RetentionSeconds,
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := api.NewServer(db, engine, hub, cfg)

	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.SetTrustedProxies(nil)
	server.SetupRoutes(r)

	logger.Info("system", "starting server", "port", port)
	if err := r.Run(":" + port); err != nil {
		logger.Error("system", "server failed", "error", err)
	}
}
