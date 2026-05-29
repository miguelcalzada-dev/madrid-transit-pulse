# Madrid Transit Pulse 🚇

**Madrid Transit Pulse** es un proyecto de visualización y analítica en tiempo real diseñado para monitorizar el estado completo de la red de trenes de **Cercanías Madrid**. A través de un panel de control interactivo (Dashboard), el sistema proporciona una radiografía instantánea de la movilidad ferroviaria de la ciudad, desde la geolocalización de cada vehículo hasta el seguimiento de incidencias oficiales.

## 🚀 Funcionalidades Principales

- **Telemetría en Vivo (Sliding Window):** El sistema mantiene un *streaming* continuo que refleja el estado exacto de la red de los últimos 30 minutos, actualizándose cada pocos segundos.
- **Mapa Interactivo:** Geolocalización de cada tren activo en su línea correspondiente, identificando visualmente qué vehículos acumulan retrasos o pertenecen a líneas con incidencias.
- **Monitorización de Incidencias:** Ingesta y deduplicación de alertas y avisos oficiales de Renfe en tiempo real, categorizadas por severidad y línea afectada.
- **Analítica Visual Avanzada:** Gráficos interactivos construidos con Recharts que permiten desglosar el estado de la red: 
  - Distribución de trenes activos por línea.
  - Velocidad media telemétrica.
  - Evolución temporal de trenes e incidencias (Series Temporales).
  - Estado global de la flota (En ruta, en parada, fuera de servicio).

## 🛠️ Arquitectura y Tecnologías

El proyecto se compone de un monorepo dividido en dos piezas clave para garantizar la baja latencia y la escalabilidad del flujo de datos:

### 1. Frontend (Cliente)
Aplicación web moderna y ultra-rápida enfocada en la experiencia de usuario y el rendimiento visual.
- **Framework:** Next.js (React)
- **Visualización de Datos:** Recharts (SVG Charts)
- **Mapas:** Leaflet / React-Leaflet
- **Estilizado:** CSS Grid dinámico, enfocado en un diseño corporativo estilo PowerBI.

### 2. Backend (Servidor de Ingesta)
Servicio en segundo plano encargado de la recolección, limpieza y transmisión de datos.
- **Entorno:** Node.js + Express
- **Comunicación en Tiempo Real:** Socket.io (WebSockets)
- **Fuentes de Datos:** Conexión directa a los feeds públicos GTFS-RT de Renfe (`vehicle_positions.json`, `alerts.json`).
- **Lógica de Dominio:** 
  - Cálculo de ventanas temporales (Garbage Collector automático para trenes inactivos).
  - Asignación de coordenadas geográficas en base a vectores de ruta.
  - Simulador de telemetría (retrasos probabilísticos y ocupación) para enriquecer la experiencia analítica del Dashboard.

## 📈 Potencial Big Data
El ecosistema ha sido diseñado sentando las bases estructurales para una evolución hacia una arquitectura de **Big Data pura**. Los eventos consumidos a través de los WebSockets en el frontend simulan el comportamiento de un microservicio de ingesta que, en un entorno de producción masivo, inyectaría el caudal de datos hacia colas distribuidas (ej. **Apache Kafka**), para ser posteriormente procesadas por motores analíticos (ej. **Apache Spark Structured Streaming**) y persistidas en bases de datos NoSQL (**MongoDB**).
