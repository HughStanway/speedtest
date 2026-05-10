package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/hughstanway/speedtest/backend/internal/logger"
	"github.com/hughstanway/speedtest/backend/internal/models"
	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

func NewDB(dbPath string) (*DB, error) {
	// Ensure the directory exists
	dir := filepath.Dir(dbPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create data directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if err := createTable(db); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	return &DB{conn: db}, nil
}

func createTable(db *sql.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME NOT NULL,
		download_mbps REAL NOT NULL,
		upload_mbps REAL NOT NULL,
		ping_ms REAL NOT NULL,
		jitter_ms REAL,
		packet_loss REAL,
		isp TEXT,
		server_id INTEGER,
		server_name TEXT,
		external_ip TEXT,
		is_scheduled BOOLEAN DEFAULT 0
	);`
	if _, err := db.Exec(query); err != nil {
		return err
	}

	// Migration: Add is_scheduled column if it doesn't exist
	// (for users already on Phase 2)
	result, _ := db.Exec("ALTER TABLE results ADD COLUMN is_scheduled BOOLEAN DEFAULT 0")
	if result != nil {
		if n, _ := result.RowsAffected(); n > 0 {
			logger.Info("database", "event=schema_updated", "column", "is_scheduled")
		}
	}

	return nil
}

func (db *DB) SaveResult(res *models.Result) error {
	query := `
	INSERT INTO results (
		timestamp, download_mbps, upload_mbps, ping_ms, jitter_ms, packet_loss, isp, server_id, server_name, external_ip, is_scheduled
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := db.conn.Exec(query,
		res.Timestamp, res.DownloadMbps, res.UploadMbps, res.PingMs, res.JitterMs, res.PacketLoss,
		res.ISP, res.ServerID, res.ServerName, res.ExternalIP, res.IsScheduled,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err == nil {
		res.ID = id
	}

	logger.Info("database", "event=result_saved", "id", res.ID)
	return nil
}

func (db *DB) GetLatestResult() (*models.Result, error) {
	query := `
		SELECT id, timestamp, download_mbps, upload_mbps, ping_ms, jitter_ms, packet_loss, isp, server_id, server_name, external_ip, is_scheduled 
		FROM results ORDER BY timestamp DESC LIMIT 1`
	row := db.conn.QueryRow(query)

	res := &models.Result{}
	err := row.Scan(
		&res.ID, &res.Timestamp, &res.DownloadMbps, &res.UploadMbps, &res.PingMs,
		&res.JitterMs, &res.PacketLoss, &res.ISP, &res.ServerID, &res.ServerName, &res.ExternalIP, &res.IsScheduled,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (db *DB) GetHistory(limit int) ([]models.Result, error) {
	if limit <= 0 {
		limit = 100 // Default limit
	}

	query := `
		SELECT id, timestamp, download_mbps, upload_mbps, ping_ms, jitter_ms, packet_loss, isp, server_id, server_name, external_ip, is_scheduled 
		FROM results ORDER BY timestamp DESC LIMIT ?`
	rows, err := db.conn.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.Result
	for rows.Next() {
		var res models.Result
		err := rows.Scan(
			&res.ID, &res.Timestamp, &res.DownloadMbps, &res.UploadMbps, &res.PingMs,
			&res.JitterMs, &res.PacketLoss, &res.ISP, &res.ServerID, &res.ServerName, &res.ExternalIP, &res.IsScheduled,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, res)
	}

	return results, nil
}

// PruneOlderThan deletes results whose timestamp is older than the given
// number of seconds from now. Returns the count of deleted rows.
func (db *DB) PruneOlderThan(seconds int64) (int64, error) {
	cutoff := time.Now().UTC().Add(-time.Duration(seconds) * time.Second)

	result, err := db.conn.Exec(
		`DELETE FROM results WHERE timestamp < ?`, cutoff.Format(time.RFC3339),
	)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

func (db *DB) Close() error {
	return db.conn.Close()
}
