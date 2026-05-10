# Home Server Speedtest Dashboard

A modern, production-ready speedtest dashboard for home servers. Built with Go, React, and the official Ookla Speedtest CLI.

## Features

- **Real-Time Monitoring**: Live bandwidth and latency updates via WebSockets with an animated circular gauge.
- **Advanced Scheduling**: Flexible testing modes — run at fixed intervals (e.g., every 1h) or at a specific daily time (e.g., 03:00 AM).
- **Data Analytics**: Interactive trend charts for Download, Upload, and Latency performance using Recharts.
- **Persistent History**: Results stored in a lightweight SQLite database with "Manual" vs. "Scheduled" labels.
- **Automatic Retention**: Configurable data pruning to keep your database clean (e.g., auto-delete tests older than 7 days).
- **Structured Logging**: Parseable backend logs with component tagging and event tracking.
- **Docker-First**: Optimized for containerized deployment with host networking for maximum accuracy.

## Architecture Overview

```text
User Browser <---> Go Backend
                         |
           +-------------+-------------+
           |             |             |
     Embedded SPA    REST & WS API   SQLite DB
                         |
                         v
                Ookla Speedtest CLI
```

- **Backend**: Go (Gin, `modernc.org/sqlite`).
- **Frontend**: React (Vite, TailwindCSS v4, Recharts, Lucide Icons).
- **Orchestration**: Docker Compose with `network_mode: host` to ensure precision in network measurements.

## Setup & Running

We provide a `Makefile` to simplify common development and deployment tasks.

### Local Development

1.  **Install dependencies**:
    ```bash
    make frontend-install
    ```
2.  **Build the full stack**:
    ```bash
    make frontend-build && make compile
    ```
3.  **Run the service using Docker**:
    ```bash
    make up
    ```
    Access at `http://localhost:8080`.

### Configuration

The application uses environment variables for configuration. You can set these in the `.env` file:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SPEEDTEST_SCHEDULE_ENABLED` | Enable automatic testing | `false` |
| `SPEEDTEST_SCHEDULE_MODE` | `interval` or `daily` | `interval` |
| `SPEEDTEST_SCHEDULE_INTERVAL` | Seconds between interval tests | `3600` |
| `SPEEDTEST_SCHEDULE_TIME` | Time for daily test (HH:mm) | `03:00` |
| `SPEEDTEST_RETENTION` | How long to keep results (seconds) | `604800` |

## Makefile Reference

| Target | Description |
| :--- | :--- |
| `make up` | Rebuilds and starts the unified stack via Docker Compose. |
| `make down` | Stops and removes containers. |
| `make logs` | Tails the structured container logs. |
| `make compile` | Builds the Go backend binary locally. |
| `make clean` | Removes build artifacts and local data. |

## Project Structure

- `backend/`: Go source code (API, Scheduler, Database, Logger).
- `frontend/`: React source code (UI, Charts, Settings Modal).
- `docker-compose.yml`: Unified service definition.
- `Makefile`: Common developer targets.

## License

MIT
