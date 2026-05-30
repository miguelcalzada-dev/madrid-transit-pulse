# Madrid Transit Pulse 🚇

**Madrid Transit Pulse** es un proyecto de visualización y analítica en tiempo real diseñado para monitorizar el estado completo de la red de trenes de **Cercanías Madrid**. A través de una interfaz interactiva y adaptativa, el sistema proporciona una radiografía instantánea de la movilidad ferroviaria de la ciudad, geolocalizando trenes, reportando incidencias oficiales e indicando los tiempos de llegada a cada estación.

## 🚀 Funcionalidades Principales

- **Dashboard Analítico:** Un panel de control global con gráficos interactivos y KPIs en tiempo real. Evolución temporal de trenes, incidencias por línea, velocidad media telemétrica y estado global de la flota. 
- **Nuevo Apartado "Estaciones":** Un completo buscador y panel de información (estilo Civia/Renfe) que muestra las 90+ estaciones de Cercanías Madrid.
  - Tiempos de llegada **en vivo** estimados mediante distancia y velocidad en tiempo real.
  - Dirección hacia dónde se dirige el tren.
  - **Favoritos persistentes** para tus estaciones habituales.
  - Geolocalización de las estaciones más **cercanas a tu ubicación**.
  - Explorador visual interactivo de líneas (C1 a C10) simulando un mapa de metro.
- **Mapa Interactivo:** Visualización satelital (Leaflet) que ubica a cada tren activo dentro de Madrid, pudiendo filtrar líneas y ver en el acto qué vehículos acumulan retrasos o pertenecen a líneas afectadas.
- **Monitorización de Alertas:** Listado dedicado de incidencias oficiales de Renfe, filtradas y categorizadas automáticamente por severidad y línea, purgando alertas genéricas redundantes y manteniendo las marcas temporales reales.
- **Diseño Mobile-First 📱:** Interfaz cuidadosamente adaptada para uso en móviles y ordenadores, con navegación dinámica flotante en iOS/Android que facilita su uso a una mano.

## 🛠️ Arquitectura y Tecnologías

El proyecto se compone de un monorepo dividido en dos piezas clave para garantizar la baja latencia y el procesamiento instantáneo:

### 1. Frontend (Cliente)
Aplicación web moderna y ultra-rápida enfocada en la experiencia de usuario y el rendimiento visual en múltiples dispositivos.
- **Framework:** Next.js (React)
- **Visualización de Datos:** Recharts (SVG Charts) para los gráficos del dashboard.
- **Mapas:** Leaflet / React-Leaflet.
- **Estilizado:** Vanilla CSS con variables nativas, priorizando el rendimiento, fluidez y estética moderna (glassmorphism, skeleton loaders).

### 2. Backend (Servidor de Ingesta)
Servicio en segundo plano encargado de la recolección continua, limpieza y transmisión de datos a gran velocidad.
- **Entorno:** Node.js + Express
- **Comunicación en Tiempo Real:** Socket.io (WebSockets)
- **Fuentes de Datos:** Conexión a los feeds públicos GTFS-RT de Renfe (`vehicle_positions.json`, `alerts.json`).
- **Lógica de Dominio:** 
  - Limpieza de GTFS-RT: Deduplicación de incidencias repetitivas, corrección de marcas de tiempo y geolocalización forzada en vectores reales de ruta.
  - Simulador de telemetría (retrasos probabilísticos y ocupación) para enriquecer analíticas.
  - Garbage Collector para desechar trenes inactivos o fuera del radio geográfico de Madrid.

## 📈 Potencial Big Data
El ecosistema ha sido diseñado sentando las bases estructurales para una evolución hacia una arquitectura de **Big Data pura**. Los eventos consumidos a través de los WebSockets en el frontend simulan el comportamiento de un microservicio de ingesta que, en un entorno de producción masivo, inyectaría el caudal de datos hacia colas distribuidas (ej. **Apache Kafka**), para ser posteriormente procesadas por motores analíticos (ej. **Apache Spark Structured Streaming**) y persistidas en bases de datos NoSQL (**MongoDB**).

## ⚖️ Licencia y Datos
Datos provistos por **Renfe Open Data** y **Consorcio Regional de Transportes de Madrid (CRTM)** bajo condiciones de reutilización abierta (Open Data). Aplicación no oficial.
