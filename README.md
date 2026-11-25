# MiniOps – DevOps Automation & Monitoring Platform

A lightweight Node.js demo web application built to demonstrate containerization, automated testing, system and application metrics collection, and availability monitoring.

Designed specifically for educational demonstration in DevOps final reviews and personal developer workstations running Fedora Linux.

---

## 1. Project Background & Architecture

In modern cloud-native engineering, software applications must be observable, testable, container-ready, and resilient. MiniOps serves as the core sample application that feeds telemetry into a complete DevOps ecosystem (Docker, GitHub Actions, Prometheus, Grafana, and Blackbox Exporter).

```
MiniOps/
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI automated pipeline
├── app/
│   ├── public/               # Frontend static assets (HTML, CSS, JS - Zero CDNs)
│   │   ├── index.html        # Clean, modern responsive homepage
│   │   ├── style.css         # Pure CSS3 with system font stack
│   │   └── script.js         # User-triggered API client (zero polling)
│   ├── scripts/
│   │   └── lint.js           # Lightweight zero-dependency syntax & code integrity validator
│   ├── src/
│   │   ├── config/           # Environment and runtime configuration
│   │   ├── middleware/       # Metrics tracker, logger, error handlers
│   │   ├── monitoring/       # prom-client registry & custom metrics
│   │   ├── routes/           # Health, users, and metrics route handlers
│   │   │   ├── healthRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   └── metricsRoutes.js
│   │   ├── app.js            # Express app assembly & export (for Supertest)
│   │   └── server.js         # HTTP server starter & graceful shutdown
│   ├── tests/                # Automated tests (Node.js test runner + Supertest)
│   │   ├── health.test.js    # Homepage & /health integration tests
│   │   ├── users.test.js     # /api/users integration tests
│   │   ├── metrics.test.js   # /metrics telemetry & noise exclusion tests
│   │   └── error.test.js     # 404, production 500 & credential redaction tests
│   ├── .dockerignore         # Docker build context exclusions for app
│   ├── .env.example          # Environment variables template
│   ├── Dockerfile            # Multi-stage production container definition
│   └── package.json          # Dependencies & npm scripts
├── blackbox/
│   └── blackbox.yml          # Blackbox Exporter HTTP probe module configuration
├── grafana/
│   ├── dashboards/
│   │   └── miniops-dashboard.json  # Auto-provisioned MiniOps dashboard
│   └── provisioning/
│       ├── dashboards/
│       │   └── dashboards.yml      # Dashboard provider configuration
│       └── datasources/
│           └── datasources.yml     # Prometheus datasource auto-provisioning
├── prometheus/
│   └── prometheus.yml        # Prometheus server configuration & scrape jobs
├── .dockerignore             # Root Docker build context exclusions
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Docker Compose stack (App + Prometheus + Grafana + Blackbox Exporter)
└── README.md                 # Project documentation
```

### Architectural Separation: `app.js` vs `server.js`
- **`app.js`**: Pure configuration of Express, static directories, middlewares, routes, and error handlers. Exports the app instance without binding to a network port. This allows **Supertest** to execute integration tests entirely in-memory without port collisions or requiring active server processes.
- **`server.js`**: Runtime entry point. Reads configuration, binds to `0.0.0.0`, and handles `SIGTERM`/`SIGINT` signals with a 5-second safety force-exit timer.

---

## 2. Technology Stack

- **Runtime**: Node.js 22 (LTS)
- **Containerization**: Docker & Docker Compose (Alpine-based, non-root user `node`)
- **CI/CD Automation**: GitHub Actions (`.github/workflows/ci.yml`)
- **Metrics Scraping & TSDB**: Prometheus v2.54.1 + `prom-client`
- **Dashboard & Visualization**: Grafana v11.2.0 (Auto-provisioned)
- **Blackbox Health Probing**: Prometheus Blackbox Exporter v0.25.0 (Synthetic HTTP 2xx probes)
- **Web Framework**: Express.js
- **Testing & Code Quality**: Node.js native test runner (`node:test`) + `supertest` + custom syntax integrity validator
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (Zero external CDNs, zero heavy frameworks)

---

## 3. Getting Started

### Prerequisites

- Fedora Linux (or any modern Linux distribution / macOS / Windows)
- Node.js >= 22.0.0
- npm >= 10.0.0
- Docker & Docker Compose

### Local Execution (Without Docker)

1. Navigate to the application directory and install dependencies:
   ```bash
   cd app
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
3. Run the application:
   - Production mode: `npm start`
   - Development mode (watch): `npm run dev`

---

## 4. Docker Compose Stack: App + Prometheus + Grafana + Blackbox Exporter (Implemented & Verified)

The project includes an integrated multi-container Docker Compose environment managing `miniops-app`, `prometheus`, `grafana`, and `blackbox-exporter`:

```yaml
services:
  miniops-app:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: miniops-app
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - HOST=0.0.0.0
      - NODE_ENV=production
      - APP_NAME=MiniOps Demo App
    stop_signal: SIGTERM
    stop_grace_period: 10s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:3001/health"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s

  prometheus:
    image: prom/prometheus:v2.54.1
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--storage.tsdb.retention.size=512MB'
      - '--web.enable-lifecycle'
    depends_on:
      miniops-app:
        condition: service_healthy
      blackbox-exporter:
        condition: service_started

  grafana:
    image: grafana/grafana-oss:11.2.0
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
    volumes:
      - ./grafana/provisioning/datasources:/etc/grafana/provisioning/datasources:ro
      - ./grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/dashboards:/etc/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

  blackbox-exporter:
    image: prom/blackbox-exporter:v0.25.0
    container_name: blackbox-exporter
    restart: unless-stopped
    ports:
      - "127.0.0.1:9115:9115"
    volumes:
      - ./blackbox/blackbox.yml:/etc/blackbox_exporter/config.yml:ro
    command:
      - '--config.file=/etc/blackbox_exporter/config.yml'

volumes:
  prometheus_data:
  grafana_data:
```

### Key Architectural Highlights
1. **Docker Service Networking**:
   - Prometheus scrapes `http://miniops-app:3001/metrics`.
   - Prometheus queries Blackbox Exporter at `http://blackbox-exporter:9115/probe?module=http_2xx&target=http://miniops-app:3001/health`.
   - Grafana queries Prometheus at `http://prometheus:9090`.
   - All internal traffic uses Docker's private bridge network, avoiding localhost dependencies.
2. **Port Conflict Protection & Host Security**:
   - `miniops-app` is exposed on `3001` (avoiding port 3000 collisions).
   - `prometheus` is exposed on `9090`.
   - Containerized `grafana` is mapped to host port `3002:3000` so it coexists seamlessly with any existing host services.
   - `blackbox-exporter` is bound exclusively to `127.0.0.1:9115` for local verification without exposing unnecessary open ports to the external network.
3. **Low-Memory Workstation Optimization**:
   - Prometheus TSDB storage is capped at 512MB.
   - Blackbox Exporter consumes only ~14MB of RAM.
   - Total RAM consumed by all four services combined is ~220MB.
4. **Zero-Configuration Auto-Provisioning**:
   - Prometheus data source is auto-provisioned upon container boot.
   - The MiniOps application dashboard is auto-imported and immediately available.
   - Anonymous viewer access is enabled (`GF_AUTH_ANONYMOUS_ENABLED=true`) for seamless presentation demonstrations.

### Managing the Stack

- **Start Stack**:
  ```bash
  docker compose up -d
  ```
- **View Service Status & Health**:
  ```bash
  docker compose ps
  ```
- **Inspect Live Logs**:
  ```bash
  docker compose logs -f
  ```
- **Stop Stack**:
  ```bash
  docker compose down
  ```

---

## 5. Grafana Dashboard & Visualization (Implemented & Verified)

Access the Grafana web interface at `http://localhost:3002`. Navigate to **Dashboards > MiniOps > MiniOps Application Dashboard**.

### Provisioned Dashboard Panels & PromQL Queries

| Panel Name | Panel Type | PromQL Expression | Unit | Description |
| :--- | :--- | :--- | :--- | :--- |
| **HTTP Request Rate** | Time Series | `sum(rate(http_requests_total[1m])) by (route, status_code)` | reqps | Visualizes incoming request throughput broken down by route and HTTP status code. |
| **HTTP Error Rate (%)** | Stat | `(sum(rate(http_requests_total{status_code=~"4..|5.."}[1m])) or vector(0)) / (sum(rate(http_requests_total[1m])) > 0 or vector(1)) * 100` | % | Displays the percentage of failing 4xx/5xx requests with color-coded thresholds. |
| **HTTP Response Time (p95)** | Time Series | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` | s | Tracks 95th percentile request latency, filtering out outliers. |
| **Application Uptime** | Stat | `app_uptime_seconds` | s (duration) | Displays live dynamic process uptime from `process.uptime()`. |
| **Application Memory Usage (RSS)** | Gauge | `process_resident_memory_bytes / 1024 / 1024` | MB | Monitors process resident memory allocation with warning thresholds. |

---

## 6. CI/CD Automation with GitHub Actions (Implemented & Verified)

Automated Continuous Integration is defined in `.github/workflows/ci.yml`. It runs automatically on every `push` or `pull_request` targeting the `main` branch.

### Pipeline Stages
1. **Source Checkout**: Checks out repository code via `actions/checkout@v4`.
2. **Runtime Setup**: Sets up Node.js 22 LTS with caching via `actions/setup-node@v4`.
3. **Deterministic Install**: Executes `npm ci` for predictable dependency resolution.
4. **Security Audit**: Scans dependencies for high-severity vulnerabilities via `npm audit --audit-level=high`.
5. **Code Syntax & Integrity Validation**: Scans all source and test files using `npm run lint`.
6. **Automated Testing**: Executes 11 unit and integration tests using `npm test`.
7. **Container Image Build**: Builds production Docker image using `docker/build-push-action@v5`.

---

## 7. Application API Endpoints

| Method | Endpoint | Description | Content-Type | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Web homepage (Vanilla UI) | `text/html` | `200 OK` |
| `GET` | `/health` | Health probe reporting status & uptime | `application/json` | `200 OK` |
| `GET` | `/api/users` | In-memory sample developer records | `application/json` | `200 OK` |
| `GET` | `/metrics` | Prometheus metrics scrape target | `text/plain; version=0.0.4` | `200 OK` |
| `*` | Any undefined `/api/*` | Structured 404 error response | `application/json` | `404 Not Found` |
| `*` | Any undefined browser route | Clean 404 HTML fallback | `text/html` | `404 Not Found` |

---

## 8. Automated Testing Suite

```bash
cd app
npm test
```

| Test File | Description | Verification Target |
| :--- | :--- | :--- |
| `tests/health.test.js` | Homepage & Health Checks | Verifies `GET /` serves HTML UI and `GET /health` returns HTTP 200 with dynamic uptime. |
| `tests/users.test.js` | Sample Users API | Verifies `GET /api/users` returns HTTP 200 and the expected in-memory developer array. |
| `tests/metrics.test.js` | Prometheus Telemetry | Verifies Prometheus exposition format, metric counter increments, and strict exclusion of `/metrics` requests. Uses `register.resetMetrics()` for test independence. |
| `tests/error.test.js` | Error Handling & Log Sanitization | Verifies structured 404 JSON for `/api/*`, clean HTML 404 for browser routes, production 500 error sanitization, and regression test ensuring sample passwords/tokens are redacted from application logs. |

---

## 9. Blackbox Exporter Health Monitoring (Implemented & Verified)

In addition to internal (white-box) application telemetry from `/metrics`, MiniOps employs external (black-box) availability probing using **Prometheus Blackbox Exporter v0.25.0**.

### Architecture & Multi-Target Scrape Pattern

Blackbox Exporter operates as a proxy probe. Prometheus instructs the exporter to probe the target endpoint and returns probe telemetry to Prometheus:

```
Prometheus (Scraper) ───[ GET /probe?target=http://miniops-app:3001/health&module=http_2xx ]───> Blackbox Exporter
                                                                                                      │
                                                                              [ GET /health ]─────────┘
                                                                                              │
                                                                                              ▼
                                                                                         miniops-app
```

### Relabel Configurations in `prometheus/prometheus.yml`
```yaml
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    scrape_interval: 15s
    static_configs:
      - targets:
          - http://miniops-app:3001/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### Verified Probe Metrics

| Metric | Type | Verified Value | Description |
| :--- | :--- | :--- | :--- |
| `probe_success` | Gauge | `1` (healthy) / `0` (downtime) | Indicates whether the probe completed successfully with an HTTP 2xx response. |
| `probe_http_status_code` | Gauge | `200` | HTTP response status code received from the target during the probe. |
| `probe_duration_seconds` | Gauge | `~0.003s` - `0.005s` | Round-trip duration for DNS resolution, TCP connection, and HTTP response processing. |

### Controlled Downtime & Recovery Verification
A controlled downtime test was executed to ensure alert readiness:
1. **Downtime Injection**: `docker compose stop miniops-app`
   - Blackbox Exporter reported connection failure (`probe_http_status_code = 0`).
   - Prometheus `probe_success` dropped from `1` to `0`.
2. **Recovery Verification**: `docker compose start miniops-app`
   - Container restarted and passed internal health check.
   - Blackbox probe resumed successful 200 OK responses.
   - Prometheus `probe_success` recovered to `1`.

---

## 10. Troubleshooting & Operational Guide

### Common Operational Issues & Remediation

1. **Port Conflicts (`EADDRINUSE`)**:
   - *Problem*: Port 3000 is occupied by a host service (e.g., local systemd Grafana on Fedora).
   - *Remedy*: MiniOps maps containerized Grafana to host port `3002:3000` and the Node.js application to `3001:3001`. If port 3001 or 3002 is busy, verify with `ss -tulpn | grep -E '3001|3002'` and update the host port in `docker-compose.yml`.
2. **Prometheus Target Shows `DOWN`**:
   - *Cause*: `miniops-app` is starting up, health check is in progress, or container crashed.
   - *Remedy*: Check container health: `docker compose ps`. Inspect application logs: `docker compose logs -f miniops-app`.
3. **Blackbox Exporter Probe Returns `probe_success 0`**:
   - *Cause*: Network partition, target stopped, or HTTP endpoint returned a non-200 status code.
   - *Remedy*: Test direct probe inside the stack: `curl "http://127.0.0.1:9115/probe?target=http://miniops-app:3001/health&module=http_2xx"`. Inspect DNS resolution and HTTP response status code in the output.
4. **Grafana Shows "No Data"**:
   - *Cause*: Prometheus has not completed its first scrape cycle (default interval is 15s) or time range in Grafana is set incorrectly.
   - *Remedy*: Verify Prometheus targets at `http://localhost:9090/targets`. In Grafana, adjust the dashboard time picker to "Last 15 minutes" and set auto-refresh to 10s.
5. **Inspecting Real-Time Container Resource Usage**:
   ```bash
   docker stats --no-stream
   ```
6. **Graceful Application & Stack Shutdown**:
   ```bash
   # Stop all services gracefully
   docker compose down

   # Or stop without removing persistent volumes
   docker compose stop
   ```

---

## 11. Mentor & Final Review Presentation Guide

### 1. Problem Statement & Motivation
- **Context**: In containerized microservice architectures, applications cannot be treated as black boxes. Telemetry (metrics, health status, logs) must be embedded natively into the application runtime, paired with external synthetic availability checks.
- **Goal**: Create a lightweight, container-ready Node.js service providing health checks, Prometheus telemetry, structured error handling, clean logging, and synthetic availability probing for integration with an automated DevOps toolchain.

### 2. Key Engineering & Architecture Highlights
- **Decoupled Architecture**: Separated `app.js` (Express configuration) from `server.js` (listener and signal handlers). Enables in-memory integration testing using Supertest without opening active ports or fighting port collisions.
- **Container Networking**: Configured Prometheus to communicate with `miniops-app:3001` and Blackbox Exporter at `blackbox-exporter:9115`, and Grafana with `http://prometheus:9090` over the Docker bridge network.
- **SRE Metric Practices**:
  - Excluded `/metrics` scrape path from request counters to eliminate scraper feedback loops.
  - Used bounded route templates (`/health`, `/api/users`, `unmatched`) to prevent high-cardinality explosions.
  - Dynamic uptime measurement using `process.uptime()` without state polling or synthetic load.
  - Dual monitoring: White-box telemetry via `/metrics` + Black-box external probing via Blackbox Exporter.
- **Security & Privacy**:
  - Implemented automated log sanitization in `logger.js` to redact credentials (`password`, `token`, `secret`, connection strings) before emitting to `stdout`/`stderr`.
  - Suppressed internal stack traces in production error responses.
  - Bound Blackbox Exporter to `127.0.0.1:9115` rather than all interfaces.
- **Resource Efficiency**:
  - Multi-stage Docker image on Alpine Linux (~65MB compressed).
  - Prometheus TSDB capped to 512MB to protect personal Fedora workstation resources.
  - Combined stack memory consumption across all 4 services is ~220MB.

### 3. 5-Minute Live Demonstration Walkthrough

| Timeline | Stage | Action / URL | Key Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 - 1:00** | **Architecture & CI Pipeline** | Inspect `docker-compose.yml` & `.github/workflows/ci.yml` | Explain decoupled Express design, multi-stage Alpine Docker build, non-root user `node`, and 7-stage CI workflow. |
| **1:00 - 2:00** | **Application & UI** | Open `http://localhost:3001` in browser | Demonstrate vanilla UI (zero CDNs/fonts), dynamic health status badge reflecting real `/health` API, interactive "Fetch Users" button. |
| **2:00 - 3:00** | **Prometheus Telemetry** | Open `http://localhost:9090/targets` | Show both active scrape targets (`miniops-app` and `blackbox-http`) in `UP` state. Query `http_requests_total` and note that `/metrics` requests are excluded. |
| **3:00 - 4:00** | **Grafana Dashboard** | Open `http://localhost:3002` | Show auto-provisioned "MiniOps Application Dashboard": Request Rate, Error Rate, p95 Latency, Uptime, and Memory Usage. Explain IaC provisioning. |
| **4:00 - 5:00** | **Blackbox Probing & Downtime Test** | Terminal: `docker compose stop miniops-app`<br>Terminal: `docker compose start miniops-app` | Show `probe_success` dropping from `1` to `0` in Prometheus during downtime, then recovering to `1` upon container restart. |

### 4. Technical Interview & Viva FAQs

**Q1: What is the difference between White-box monitoring and Black-box monitoring in this project?**  
> *Answer*: **White-box monitoring** inspects internal application telemetry exposed from within the application process (e.g. `prom-client` exposing memory usage, request duration histograms, and error rates via `/metrics`). **Black-box monitoring** treats the application as an opaque external target (e.g. Prometheus querying Blackbox Exporter to send synthetic HTTP GET requests to `/health` to verify network reachability, DNS resolution, and HTTP status codes). Both are essential for SRE observability.

**Q2: How does the Prometheus Blackbox Exporter multi-target pattern work?**  
> *Answer*: Rather than deploying an exporter daemon per target, Prometheus uses relabel configs:
> 1. The target URL (`http://miniops-app:3001/health`) is written into the `__param_target` query parameter.
> 2. The `instance` label is preserved as the target URL for query readability.
> 3. The `__address__` label is rewritten to `blackbox-exporter:9115`.
> Prometheus scrapes Blackbox Exporter, which executes the HTTP probe and returns metrics like `probe_success`.

**Q3: How does Grafana connect to Prometheus inside Docker Compose?**  
> *Answer*: Docker Compose automatically creates a shared bridge network where containers can resolve each other by service name. In `datasources.yml`, we configure `url: http://prometheus:9090`. Grafana sends HTTP queries directly to the Prometheus service on that network.

**Q4: Why use provisioning files instead of configuring dashboards manually in the Grafana UI?**  
> *Answer*: Manual UI configuration violates Infrastructure as Code (IaC) principles. If a container is recreated or deployed on another machine, manual dashboards are lost. By storing datasource and dashboard definitions in Git and mounting them into `/etc/grafana/provisioning/`, our observability stack is 100% reproducible and automated.

**Q5: What does `histogram_quantile(0.95, ...)` compute?**  
> *Answer*: It computes the 95th percentile latency from the histogram buckets exposed by `prom-client`. It means 95% of incoming HTTP requests were answered within that duration, which is standard practice in Service Level Objectives (SLOs) because it highlights latency spikes that averages hide.

**Q6: Why run the application as a non-root user (`node`) inside Docker?**  
> *Answer*: Running as `root` inside a container presents a significant security risk. If an application vulnerability allows Remote Code Execution (RCE), an attacker could escape container isolation or manipulate host-mapped files. Using `USER node` (UID 1000) enforces the principle of least privilege.

**Q7: How did you prevent high-cardinality metric explosions?**  
> *Answer*: By normalizing the `route` label in request middleware to canonical route templates (`/`, `/health`, `/api/users`, `unmatched`) rather than raw URLs with dynamic IDs or random query parameters, preventing unbound memory consumption in Prometheus.

---

## 12. Implemented Scope vs. Future Enhancements

### Implemented & Verified in MiniOps
- [x] Node.js 22 LTS modular Express backend with decoupled `app.js` and `server.js`.
- [x] Vanilla HTML5/CSS3/JS frontend with dynamic health badge and zero CDN dependencies.
- [x] Comprehensive automated test suite (11 tests across 4 suites) using Node native test runner + Supertest.
- [x] Production Dockerfile with Alpine base, multi-stage build, unprivileged user `node`, and native health check.
- [x] GitHub Actions CI workflow covering dependencies, security audit, linting, tests, and Docker build.
- [x] Prometheus TSDB integration with isolated registry, default Node.js metrics, and custom HTTP metrics.
- [x] Grafana OSS integration with auto-provisioned Prometheus data source and MiniOps dashboard.
- [x] Prometheus Blackbox Exporter with HTTP probe module and verified downtime/recovery simulation.
- [x] Secure configuration: automated credential log redaction, `.dockerignore`, `.gitignore`, and localhost binding for internal exporters.

### Future Architectural Enhancements (Production Scale)
- Alertmanager integration with Slack / PagerDuty / Email notifications for `probe_success == 0` or high error rate.
- HTTPS / TLS termination via Nginx or Traefik reverse proxy with Let's Encrypt automated certificates.
- Distributed tracing integration with OpenTelemetry and Jaeger for microservice request tracing.
- Centralized log aggregation with Grafana Loki and Promtail.
