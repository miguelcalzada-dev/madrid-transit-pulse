# Madrid Transit Pulse — Skills & Technologies

## Frontend (`frontend/`)
- **Next.js 14** with App Router (`src/app/`)
- **React 18** with TypeScript (`@/*` → `src/*`)
- **Leaflet / React-Leaflet** — interactive map
- **Recharts** — SVG dashboard charts
- **Socket.io Client** — real-time WebSocket data
- **Lucide React** — icons
- **CSS** (vanilla, no Tailwind/SASS — glassmorphism, skeleton loaders)

## Backend API (`backend-api/`)
- **Node.js 20+** with **Express 4**
- **Socket.io** — bi-directional real-time communication
- **Mongoose** — MongoDB ODM
- **Helmet + CORS + Rate Limiting** — security
- **Winston + Morgan** — logging
- **MongoDB Change Streams** (production) / **in-memory mock DB** (development)
- Mock mode auto-detected when `MONGO_URI` is unset or contains `PLACEHOLDER`

## Ingestion Service (`ingestion-service/`)
- **Spring Boot 3.2** — Java 21
- **Spring Kafka** — JSON producer to `madrid-transit-raw` topic
- **Spring WebFlux** — reactive HTTP client for EMT/Renfe APIs
- **Springdoc OpenAPI** — Swagger UI at `/swagger-ui.html`
- **Lombok** — model boilerplate reduction
- **Micrometer + Prometheus** — metrics

## Spark Processor (`spark-processor/`)
- **PySpark 3.5** Structured Streaming
- **Spark SQL Kafka connector** (`spark-sql-kafka-0-10_2.12:3.5.0`)
- **MongoDB Spark connector** (`mongo-spark-connector_2.12:10.3.0`)
- **Spark MLlib** — Random Forest regression for delay prediction
- **Pytest** — unit tests with local SparkSession (no external deps)

## Infrastructure (`infrastructure/docker/`)
- **Docker Compose** — local dev environment
- **Kafka 7.5 + Zookeeper** — message bus
- **MongoDB 7.0** — persistent store
- **Mongo Express** — DB UI (port 8081)
- **Kafka UI** — topic browser (port 8090)

## Data Sources
- **Renfe GTFS-RT** — vehicle positions + alerts feeds
- **EMT Madrid Open Data API** — bus positions
- **CRTM** — transport consortium data
