# Madrid Transit Pulse

[![CI](https://github.com/miguelcalzada-dev/madrid-transit-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/miguelcalzada-dev/madrid-transit-pulse/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/demo-miguelcalzada.com%2Fmadrid--transit-3b82f6?style=flat-square)](https://miguelcalzada.com/madrid-transit)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

**Madrid Transit Pulse** es una plataforma de visualización y analítica en tiempo real para monitorizar el estado de la red de **Cercanías Madrid**. Proporciona una radiografía instantánea de la movilidad ferroviaria: geolocalización de trenes, incidencias oficiales y tiempos de llegada estimados por estación.

**Demo en producción:** <https://miguelcalzada.com/madrid-transit>

> Proyecto no oficial. Datos de **Renfe Open Data** y **Consorcio Regional de Transportes de Madrid (CRTM)** bajo condiciones de reutilización abierta.

---

## Tabla de contenidos

- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Infraestructura Big Data (roadmap)](#infraestructura-big-data-roadmap)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Datos y licencia](#datos-y-licencia)
- [Autor](#autor)

---

## Funcionalidades

- **Dashboard analítico** — KPIs en tiempo real, evolución temporal de la flota, incidencias por línea, velocidad media telemétrica y estado global.
- **Estaciones** — buscador e información de las 90+ estaciones de Cercanías Madrid con tiempos de llegada estimados en vivo, dirección del tren, favoritos persistentes y geolocalización de estaciones cercanas.
- **Mapa interactivo** — visualización satelital (Leaflet) de cada tren activo, con filtrado por línea y detección de retrasos.
- **Monitorización de alertas** — incidencias oficiales de Renfe categorizadas por severidad y línea, con deduplicación y marcas temporales reales.
- **Diseño mobile-first** — interfaz adaptada a móvil y escritorio, con navegación flotante en iOS/Android.

## Arquitectura

El proyecto es un **monorepo** con dos piezas principales para garantizar baja latencia:

```text
┌────────────────────────┐        REST + WebSocket        ┌────────────────────────┐
│   Frontend (Next.js)   │ ◀────────────────────────────▶ │  Backend API (Node)    │
│  Dashboard · Mapa · UI │                                │  Express + Socket.io   │
└────────────────────────┘                                └───────────┬────────────┘
                                                                      │
                                              ┌───────────────────────┼───────────────────────┐
                                              ▼                       ▼                       ▼
                                    GTFS-RT Renfe (Renfe)      mockDb (simulación)      MongoDB (opcional)
```

- **Modo mock (por defecto):** `mockDb.js` genera datos de simulación deterministas en memoria. **No requiere MongoDB** y es el modo que se usa en producción para la demo pública.
- **Modo real:** con `USE_MOCK=false` y `MONGO_URI` configurado, se persiste en **MongoDB** y se puede usar Change Streams para el streaming de alertas.
- **GTFS-RT:** el servicio `gtfsService` consume los feeds públicos de Renfe (`vehicle_positions`, `alerts`) y alimenta tiempos de llegada y estado de la flota.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript |
| Visualización | Recharts · Leaflet / React-Leaflet |
| Estilos | CSS nativo con variables (glassmorphism, skeleton loaders) |
| Backend | Node.js 20 · Express · Socket.io |
| Datos | GTFS-RT (Renfe) · `mockDb` en memoria · MongoDB (opcional) |
| Observabilidad | Winston (logging) · Helmet · express-rate-limit |
| Tests | Jest + Supertest (backend) · pytest (spark) |
| Infra local | Docker Compose (Kafka, Zookeeper, MongoDB, Mongo Express) |

## Puesta en marcha

Requisitos: **Node.js 20+**.

### Backend

```bash
cd backend-api
cp .env.example .env
npm install
npm run dev          # http://localhost:3001
```

Por defecto arranca en **modo mock**, sin necesidad de base de datos.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev          # http://localhost:3000
```

### Tests

```bash
cd backend-api
npm test             # Jest + Supertest (con cobertura)
```

## Variables de entorno

Todas las variables están documentadas en [`backend-api/.env.example`](./backend-api/.env.example) y [`frontend/.env.local.example`](./frontend/.env.local.example).

| Variable | Ámbito | Descripción |
| --- | --- | --- |
| `USE_MOCK` | Backend | `true` usa simulación en memoria; `false` usa MongoDB. |
| `MONGO_URI` | Backend | Cadena de conexión a MongoDB (solo con `USE_MOCK=false`). |
| `CORS_ORIGINS` | Backend | Lista blanca **explícita** de orígenes, separados por coma. No se admiten comodines por subdominio. |
| `PORT` | Backend | Puerto del servidor HTTP/WebSocket. |
| `NEXT_PUBLIC_API_URL` | Frontend | URL base del backend (REST). |
| `NEXT_PUBLIC_WS_URL` | Frontend | URL base del backend (WebSocket). |

> **Seguridad:** el CORS es una lista blanca estricta. Si despliegas el frontend en otro dominio, añádelo a `CORS_ORIGINS`; de lo contrario las peticiones se rechazarán.

## Infraestructura Big Data (roadmap)

El repositorio incluye las bases estructurales para evolucionar hacia una arquitectura de **Big Data pura**, aunque la demo pública funciona en modo mock:

```text
Renfe GTFS-RT ──▶ ingestion-service (Java) ──▶ Kafka ──▶ spark-processor ──▶ MongoDB ──▶ Backend API ──▶ Frontend
   (fuente)          (productor)             (bus)     (streaming)          (sink)
```

- **`ingestion-service/`** — microservicio Java (Spring Boot) productor de eventos hacia Kafka.
- **`spark-processor/`** — procesamiento en streaming con Apache Spark (detección de anomalías).
- **`infrastructure/docker/`** — stack local con Docker Compose: Zookeeper, Kafka, Kafka UI, MongoDB y Mongo Express.

Levantar el stack completo en local:

```bash
cd infrastructure/docker
docker compose up -d
```

| Servicio | URL local |
| --- | --- |
| Kafka UI | <http://localhost:8090> |
| Mongo Express | <http://localhost:8081> |

## Estructura del repositorio

```text
backend-api/            # API REST + WebSocket (Node.js/Express)
  src/
    routes/             # Endpoints REST
    services/           # gtfsService, socketService, mockDb, cercanias
    models/             # Modelos Mongoose
    __tests__/          # Tests Jest + Supertest
frontend/               # SPA Next.js
  src/app/              # Rutas (dashboard, estaciones, alertas)
  src/components/       # UI, analítica y mapa
  src/hooks/            # useTransitData
ingestion-service/      # Productor Kafka (Java/Spring Boot)
spark-processor/        # Streaming con Apache Spark (Python)
infrastructure/docker/  # Docker Compose (Kafka, MongoDB, UIs)
```

## Datos y licencia

- **Fuente de datos:** Renfe Open Data y CRTM (Open Data). Aplicación **no oficial**.
- **Licencia del código:** [MIT](./LICENSE).

## Autor

**Miguel Ángel Calzada Martín** — Software Developer · IA & Big Data

- GitHub: [@miguelcalzada-dev](https://github.com/miguelcalzada-dev)
- Web: [miguelcalzada.com](https://miguelcalzada.com)
