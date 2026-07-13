# AGENTS.md — Madrid Transit Pulse

Monorepo: Next.js 14 frontend + Express/Node.js backend API + Spring Boot 3.2 ingestion service + PySpark streaming processor. Real-time Cercanías Madrid visualization with GTFS-RT data.

## Commands

### Frontend (`frontend/`)
- `npm run dev` — Next.js dev server (default port 3000)
- `npm run build` — production build
- `npm run lint` — `next lint` (ESLint)
- `npm run type-check` — `tsc --noEmit`
- Deploy via Vercel (`vercel.json` present, region `mad1`)

### Backend API (`backend-api/`)
- `npm run dev` — nodemon `src/server.js` (default port 3001)
- `npm run start` — node `src/server.js`
- `npm test` — Jest with coverage
- `npm run lint` — ESLint `src/`

### Ingestion Service (`ingestion-service/`)
- Java 21 + Maven, parent POM at root
- `mvn clean package -pl ingestion-service` from root
- Spring Boot 3.2 Kafka producer, publishes to `madrid-transit-raw`
- Swagger UI at `http://localhost:8080/swagger-ui.html`

### Spark Processor (`spark-processor/`)
- `pip install -r requirements.txt` (pyspark 3.5, pytest)
- `pytest tests/test_anomaly_detection.py -v` — unit tests (local SparkSession, no external deps)
- `./submit-spark.sh local` — run streaming job against local Kafka + MongoDB
- Requires `spark-submit` on PATH; Maven packages: `spark-sql-kafka-0-10_2.12:3.5.0`, `mongo-spark-connector_2.12:10.3.0`

## Infrastructure (`infrastructure/docker/`)
- `docker compose up -d` — Kafka 7.5, Zookeeper, MongoDB 7.0, Mongo Express (port 8081), Kafka UI (port 8090)
- Topics: `madrid-transit-raw` (3 partitions), `madrid-transit-processed`
- MongoDB user `mtp_app` / `mtp_secure_pass`, DB `madrid_transit`, collections: `transit_alerts` (TTL 24h), `vehicle_status`

## Key Architecture Notes

| Directory | Tech | Role |
|---|---|---|
| `frontend/` | Next.js 14, App Router, TypeScript | User dashboard, map, alerts |
| `backend-api/` | Node.js + Express + Socket.io | REST + WebSocket bridge; mock DB fallback when MongoDB unavailable |
| `ingestion-service/` | Spring Boot 3.2 + Kafka + WebFlux | Polls EMT/Renfe APIs, publishes JSON to Kafka |
| `spark-processor/` | PySpark Structured Streaming | Reads Kafka, detects anomalies, writes to MongoDB |

- Frontend talks to backend API via REST + WebSocket (Socket.io)
- Backend API reads from MongoDB (or in-memory mock when `USE_MOCK=true` or `MONGO_URI` unset/placeholder)
- Ingestion service -> Kafka -> Spark Processor -> MongoDB is the full pipeline (optional — frontend can work with mock data alone)
- Source `@/*` maps to `frontend/src/*`

## Environment Files

- `backend-api/.env` — copy from `.env.example`; `PORT`, `MONGO_URI`, `CORS_ORIGINS`, etc.
- `frontend/.env.local` — copy from `.env.local.example`; `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- Both `.env*` files are gitignored

## Test Quirks
- No frontend tests exist
- Backend API tests use Jest + supertest (`--forceExit` for socket.io cleanup)
- `USE_MOCK=true` + `MONGO_URI=PLACEHOLDER` in test env to avoid real MongoDB
- Spark processor tests use local SparkSession fixture (`@pytest.fixture(scope="session")`), no external deps

## Infrastructure Secrets

- `infrastructure/docker/.env.example` — copy to `.env` for local Docker secrets
- `GTFS_STATIC_URL` (env var, optional) — URL for auto-download of GTFS static data zip
- `DELAY_DAMPING_FACTOR` (env var, default 0.85) — delay propagation decay per stop
