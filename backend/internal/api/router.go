package api

import (
	"github.com/gin-gonic/gin"
	"github.com/hughstanway/speedtest/backend/internal/websocket"
)

func (s *Server) SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/latest", s.GetLatest)
		api.GET("/status", s.GetStatus)
		api.POST("/run", s.RunTest)
		api.GET("/history", s.GetHistory)
		api.GET("/settings", s.GetSettings)
		api.PUT("/settings", s.UpdateSettings)
	}

	r.GET("/ws", websocket.HandleWS(s.hub))

	ServeStatic(r)
}
