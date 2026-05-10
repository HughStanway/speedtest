# Home Server Speedtest Dashboard

A modern, production-ready speedtest dashboard for home servers. Built with Go, React, and the official Ookla Speedtest CLI.

## Features

- **Real-Time Monitoring**: Live bandwidth and latency updates via WebSockets.
- **Unified Architecture**: Single-binary deployment with React embedded in Go.
- **Persistent History**: Results stored in a lightweight SQLite database.
- **Premium UI**: Responsive, dark-mode dashboard with interactive charts.
- **Docker-First**: Optimized for containerized deployment with host networking for accuracy.

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
- **Frontend**: React (Vite, TailwindCSS v4, Lucide Icons).
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
    make frontend-build && make build
    ```
3.  **Run the server**:
    ```bash
    make run
    ```
    Access at `http://localhost:8080` (API & UI).

### Docker Deployment (Recommended)

1.  **Start the stack**:
    ```bash
    make docker-up
    ```
2.  **View Logs**:
    ```bash
    make logs
    ```
3.  **Stop the stack**:
    ```bash
    make docker-down
    ```

## Makefile Reference

| Target | Description |
| :--- | :--- |
| `make build` | Builds the Go backend binary. |
| `make run` | Builds and starts the backend locally. |
| `make frontend-install` | Installs frontend dependencies. |
| `make frontend-build` | Builds the frontend static assets. |
| `make docker-up` | Starts the unified stack with Docker Compose. |
| `make docker-down` | Stops and removes containers. |
| `make logs` | Tails the container logs. |
| `make clean` | Removes build artifacts and local data. |

## Project Structure

- `backend/`: Go source code (API, Engine, Database).
- `frontend/`: React source code (UI, Charts, WebSockets).
- `docker-compose.yml`: Unified service definition.
- `Makefile`: Common developer targets (`build`, `run`, `docker-up`).

## License

MIT
