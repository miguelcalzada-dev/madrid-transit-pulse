/**
 * api.test.js — Tests de humo del backend API
 * Ejecutar: npm test
 */
'use strict';

process.env.USE_MOCK = 'true';
process.env.MONGO_URI = 'PLACEHOLDER_MONGO_URI';
process.env.LOG_LEVEL = 'silent';

const request = require('supertest');

let app;
let httpServer;

beforeAll(async () => {
  process.env.PORT = '3099';
  const server = require('../server');
  app = server.app;
  httpServer = server.httpServer;
  await new Promise(r => setTimeout(r, 500));
});

afterAll(() => {
  httpServer.close();
});

describe('GET /', () => {
  it('should return API info with mock mode', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.nombre).toContain('Madrid Transit Pulse');
    expect(res.body.modo).toContain('mock');
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.endpoints.status).toBe('GET /api/status');
  });
});

describe('GET /api/health', () => {
  it('should return health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('mtp-backend-api');
  });
});

describe('GET /api/status', () => {
  it('should return system status with mock data', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.alertas)).toBe(true);
    expect(Array.isArray(res.body.vehiculos)).toBe(true);
    expect(res.body.resumen).toBeDefined();
    expect(typeof res.body.resumen.totalVehiculosActivos).toBe('number');
  });
});

describe('GET /api/lines', () => {
  it('should return lines data', async () => {
    const res = await request(app).get('/api/lines');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.lineas)).toBe(true);
  });
});

describe('GET /api/alerts', () => {
  it('should return alerts', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.alertas)).toBe(true);
  });
});

describe('GET /api/estaciones/llegadas (with GTFS mock)', () => {
  it('should return empty arrivals for valid station ID', async () => {
    const res = await request(app).get('/api/estaciones/llegadas?estacionId=ATOCHA');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.llegadas)).toBe(true);
  });

  it('should return 400 for missing estacionId', async () => {
    const res = await request(app).get('/api/estaciones/llegadas');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/ruta-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});
