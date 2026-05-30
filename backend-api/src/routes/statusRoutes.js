/**
 * statusRoutes.js - Endpoints REST (factory que recibe repositorios inyectados)
 * Madrid Transit Pulse: Backend API
 */

const express = require('express');

/**
 * Crea y retorna el router con los repos inyectados.
 * Esto permite intercambiar MongoDB real ↔ MockDB sin cambiar lógica de rutas.
 *
 * @param {object} TransitAlert  - Repositorio de alertas
 * @param {object} VehicleStatus - Repositorio de vehículos
 * @returns {express.Router}
 */
module.exports = function buildRoutes(TransitAlert, VehicleStatus, generarHorarioEstacion) {
  const router = express.Router();
  const logger  = require('../config/logger');

  // ----------------------------------------------------------
  // GET /api/status
  // ----------------------------------------------------------
  router.get('/status', async (req, res) => {
    try {
      const limite = parseInt(req.query.limit) || 50;

      const [alertasRecientes, vehiculosActivos, conteoSeveridad, topLineas] = await Promise.all([
        TransitAlert.obtenerRecientes({}, limite),
        VehicleStatus.find().sort({ tieneAlerta: -1 }).limit(200).lean(),
        TransitAlert.contarPorSeveridad(),
        TransitAlert.topLineasConAlertas(5),
      ]);

      const totalAlertas  = conteoSeveridad.reduce((acc, s) => acc + s.count, 0);
      const alertasAltas  = conteoSeveridad.find(s => s._id === 'ALTA')?.count  || 0;
      const alertasMedias = conteoSeveridad.find(s => s._id === 'MEDIA')?.count || 0;
      const alertasBajas  = conteoSeveridad.find(s => s._id === 'BAJA')?.count  || 0;

      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        resumen: {
          totalVehiculosActivos: vehiculosActivos.length,
          totalAlertas,
          alertasPorSeveridad: { ALTA: alertasAltas, MEDIA: alertasMedias, BAJA: alertasBajas },
        },
        topLineasIncidencias: topLineas,
        alertas:   alertasRecientes,
        vehiculos: vehiculosActivos,
      });
    } catch (err) {
      logger.error(`[GET /status] ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/alerts
  // ----------------------------------------------------------
  router.get('/alerts', async (req, res) => {
    try {
      const { page = 1, limit = 20, lineId, severity, source, alertType } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filtro = {};
      if (lineId)    filtro.lineId    = lineId;
      if (severity)  filtro.severity  = severity.toUpperCase();
      if (source)    filtro.source    = source.toUpperCase();
      if (alertType) filtro.alertType = alertType;

      const [alertas, total] = await Promise.all([
        TransitAlert.find(filtro).sort({ detectedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        TransitAlert.countDocuments(filtro),
      ]);

      res.json({
        ok: true,
        paginacion: {
          pagina: parseInt(page),
          limite: parseInt(limit),
          total,
          totalPaginas: Math.ceil(total / parseInt(limit)),
        },
        alertas,
      });
    } catch (err) {
      logger.error(`[GET /alerts] ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/alerts/:id
  // ----------------------------------------------------------
  router.get('/alerts/:id', async (req, res) => {
    try {
      const alerta = await TransitAlert.findById(req.params.id).lean();
      if (!alerta) return res.status(404).json({ ok: false, error: 'Alerta no encontrada' });
      res.json({ ok: true, alerta });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/lines/stats
  // ----------------------------------------------------------
  router.get('/lines/stats', async (req, res) => {
    try {
      const [alertas, vehiculos] = await Promise.all([
        TransitAlert.find().lean(),
        VehicleStatus.find().lean()
      ]);

      const linesMap = new Map();

      // Agrupar vehículos
      for (const v of vehiculos) {
        if (!linesMap.has(v.lineId)) {
          linesMap.set(v.lineId, { lineId: v.lineId, trains: 0, alerts: 0, avgSpeed: 0, _speedSum: 0, _speedCnt: 0 });
        }
        const stats = linesMap.get(v.lineId);
        stats.trains++;
        if (v.speedKmh > 0) {
          stats._speedSum += v.speedKmh;
          stats._speedCnt++;
        }
      }

      // Agrupar alertas
      for (const a of alertas) {
        if (!linesMap.has(a.lineId)) {
          linesMap.set(a.lineId, { lineId: a.lineId, trains: 0, alerts: 0, avgSpeed: 0, _speedSum: 0, _speedCnt: 0 });
        }
        linesMap.get(a.lineId).alerts++;
      }

      const result = Array.from(linesMap.values()).map(s => {
        s.avgSpeed = s._speedCnt > 0 ? Math.round(s._speedSum / s._speedCnt) : 0;
        delete s._speedSum;
        delete s._speedCnt;
        return s;
      }).sort((a, b) => a.lineId.localeCompare(b.lineId));

      res.json({ ok: true, lines: result });
    } catch (err) {
      logger.error(`[GET /lines/stats] ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/lines
  // ----------------------------------------------------------
  router.get('/lines', async (req, res) => {
    try {
      const topN = parseInt(req.query.top) || 10;
      const lineas = await TransitAlert.topLineasConAlertas(topN);
      res.json({ ok: true, lineas });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/stats
  // ----------------------------------------------------------
  router.get('/stats', async (req, res) => {
    try {
      const [conteoSeveridad, topLineas, totalVehiculos, vehiculosConAlerta] = await Promise.all([
        TransitAlert.contarPorSeveridad(),
        TransitAlert.topLineasConAlertas(3),
        VehicleStatus.countDocuments(),
        VehicleStatus.countDocuments({ tieneAlerta: true }),
      ]);

      const distribucionFuente = await TransitAlert.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]);

      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        kpis: {
          totalVehiculos,
          vehiculosConAlerta,
          porcentajeConAlerta: totalVehiculos
            ? ((vehiculosConAlerta / totalVehiculos) * 100).toFixed(1) : '0.0',
          alertasPorSeveridad: conteoSeveridad.reduce((acc, s) => {
            acc[s._id] = s.count; return acc;
          }, { ALTA: 0, MEDIA: 0, BAJA: 0 }),
          distribucionFuente: distribucionFuente.reduce((acc, f) => {
            acc[f._id] = f.count; return acc;
          }, { EMT: 0, RENFE: 0 }),
        },
        topLineas,
      });
    } catch (err) {
      logger.error(`[GET /stats] ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ----------------------------------------------------------
  // GET /api/health
  // ----------------------------------------------------------
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'mtp-backend-api',
      uptime: `${Math.floor(process.uptime())}s`,
    });
  });

  // ----------------------------------------------------------
  // GET /api/estaciones/llegadas
  // ----------------------------------------------------------
  router.get('/estaciones/llegadas', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      const lineas = req.query.lineas ? req.query.lineas.split(',') : [];

      if (!lat || !lon) {
        return res.status(400).json({ ok: false, error: 'Faltan parámetros lat y lon' });
      }

      if (typeof generarHorarioEstacion === 'function') {
        const llegadas = generarHorarioEstacion(lineas);
        res.json({ ok: true, timestamp: new Date().toISOString(), llegadas });
      } else {
        res.json({ ok: true, llegadas: [] });
      }
    } catch (err) {
      logger.error(`[GET /estaciones/llegadas] ${err.message}`);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
