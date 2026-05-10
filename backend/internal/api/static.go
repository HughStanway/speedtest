package api

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// StaticFS is the embedded filesystem for the frontend
// Note: This requires the frontend/dist folder to be present at build time.
// In the Dockerfile, we will copy frontend/dist into backend/internal/api/dist.
//
//go:embed dist/*
var staticFS embed.FS

func ServeStatic(r *gin.Engine) {
	sub, err := fs.Sub(staticFS, "dist")
	if err != nil {
		return
	}

	staticServer := http.FileServer(http.FS(sub))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// If the path starts with /api, we don't serve static files
		if strings.HasPrefix(path, "/api") {
			return
		}

		// Serve the static file
		// If the file doesn't exist, FileServer will handle the fallback or we can handle it manually for SPA
		// For React SPA, we want to serve index.html for any non-file request.
		
		// Check if it's a file request (has extension)
		if !strings.Contains(path, ".") {
			c.Request.URL.Path = "/"
		}
		
		staticServer.ServeHTTP(c.Writer, c.Request)
	})
}
