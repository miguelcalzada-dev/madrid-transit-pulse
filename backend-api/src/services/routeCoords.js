/**
 * routeCoords.js - Coordenadas de ruta reales de Cercanías Madrid
 * Usadas para interpolar posiciones GPS cuando Renfe no las proporciona.
 * Puntos clave de cada línea (estaciones principales, en orden).
 */

const LINEAS_CERCANIAS = {
  C1: {
    nombre: 'Aeropuerto T4 - Príncipe Pío',
    color: '#e8614c',
    puntos: [
      { lat: 40.4975, lon: -3.5691 }, // Aeropuerto T4
      { lat: 40.4721, lon: -3.6795 }, // Chamartín
      { lat: 40.4530, lon: -3.6910 }, // Nuevos Ministerios
      { lat: 40.4168, lon: -3.7038 }, // Sol
      { lat: 40.4143, lon: -3.7194 }, // Príncipe Pío
    ],
  },
  C2: {
    nombre: 'Guadalajara - Chamartín',
    color: '#4d9bd9',
    puntos: [
      { lat: 40.6300, lon: -3.1750 }, // Guadalajara
      { lat: 40.5500, lon: -3.4000 }, // Alcalá de Henares
      { lat: 40.4975, lon: -3.5800 }, // Torrejón de Ardoz
      { lat: 40.4721, lon: -3.6795 }, // Chamartín
    ],
  },
  C3: {
    nombre: 'El Escorial / Aranjuez - Atocha',
    color: '#f39c27',
    puntos: [
      { lat: 40.5900, lon: -4.1200 }, // El Escorial
      { lat: 40.4589, lon: -3.8690 }, // Las Rozas
      { lat: 40.4168, lon: -3.7038 }, // Sol
      { lat: 40.4058, lon: -3.6903 }, // Atocha
      { lat: 40.2500, lon: -3.5900 }, // Aranjuez
    ],
  },
  C4: {
    nombre: 'Parla / Alcobendas - Chamartín',
    color: '#6db33f',
    puntos: [
      { lat: 40.2420, lon: -3.7730 }, // Parla
      { lat: 40.3300, lon: -3.7500 }, // Getafe
      { lat: 40.4058, lon: -3.6903 }, // Atocha
      { lat: 40.4168, lon: -3.7038 }, // Sol
      { lat: 40.4530, lon: -3.6910 }, // Nuevos Ministerios
      { lat: 40.4721, lon: -3.6795 }, // Chamartín
      { lat: 40.5500, lon: -3.6400 }, // Alcobendas
    ],
  },
  C5: {
    nombre: 'Humanes - Móstoles El Soto',
    color: '#9b59b6',
    puntos: [
      { lat: 40.2350, lon: -3.8800 }, // Humanes
      { lat: 40.3225, lon: -3.8650 }, // Móstoles
      { lat: 40.3860, lon: -3.8100 }, // Fuenlabrada
      { lat: 40.4058, lon: -3.6903 }, // Atocha
    ],
  },
  C7: {
    nombre: 'Alcalá / Móstoles - Chamartín',
    color: '#e74c3c',
    puntos: [
      { lat: 40.5500, lon: -3.4000 }, // Alcalá de Henares
      { lat: 40.4721, lon: -3.6795 }, // Chamartín
      { lat: 40.4168, lon: -3.7038 }, // Sol
      { lat: 40.4058, lon: -3.6903 }, // Atocha
      { lat: 40.3225, lon: -3.8650 }, // Móstoles
    ],
  },
  C8: {
    nombre: 'Villalba - Atocha',
    color: '#1abc9c',
    puntos: [
      { lat: 40.6600, lon: -4.0100 }, // Villalba
      { lat: 40.5600, lon: -3.8500 }, // Collado Villalba
      { lat: 40.4589, lon: -3.8690 }, // Las Rozas
      { lat: 40.4530, lon: -3.6910 }, // Nuevos Ministerios
      { lat: 40.4058, lon: -3.6903 }, // Atocha
    ],
  },
  C9: {
    nombre: 'Cercedilla - Cotos',
    color: '#7f8c8d',
    puntos: [
      { lat: 40.7570, lon: -4.0540 }, // Cercedilla
      { lat: 40.8000, lon: -3.9800 }, // Navacerrada
      { lat: 40.8700, lon: -4.0500 }, // Cotos
    ],
  },
  C10: {
    nombre: 'Villalba - Chamartín',
    color: '#2980b9',
    puntos: [
      { lat: 40.6600, lon: -4.0100 }, // Villalba
      { lat: 40.5600, lon: -3.8500 }, // Collado Villalba
      { lat: 40.4900, lon: -3.7700 }, // Las Matas
      { lat: 40.4650, lon: -3.7200 }, // Pozuelo
      { lat: 40.4721, lon: -3.6795 }, // Chamartín
    ],
  },
};

/**
 * Devuelve un punto aleatorio interpolado a lo largo de la ruta de la línea.
 * Mucho más realista que un punto único aleatorio.
 * @param {string} lineId - Código de línea (C1, C2, ...)
 * @param {string} vehicleId - ID del tren para espaciar
 * @returns {{ lat: number, lon: number }}
 */
function getPuntoEnRuta(lineId, vehicleId = '') {
  const linea = LINEAS_CERCANIAS[lineId];
  if (!linea || linea.puntos.length < 2) {
    return { lat: 40.4058 + (Math.random() - 0.5) * 0.05, lon: -3.6903 + (Math.random() - 0.5) * 0.05 };
  }

  // Ciclo completo = 50 minutos (3000 segundos)
  const cycleDuration = 3000;
  const now = Math.floor(Date.now() / 1000);

  // Seed basada en vehicleId para espaciarlos en la línea
  let seed = 0;
  for(let i=0; i<vehicleId.length; i++) {
    seed = (seed * 31 + vehicleId.charCodeAt(i)) % cycleDuration;
  }

  // Posición a lo largo de la ruta (0 a 1)
  const t = ((now + seed * 43) % cycleDuration) / cycleDuration;
  
  const puntos = linea.puntos;
  const totalSegs = puntos.length - 1;
  const segProgress = t * totalSegs;
  const segIdx = Math.floor(segProgress);
  const segT = segProgress - segIdx;
  
  const p1 = puntos[segIdx];
  const p2 = puntos[segIdx + 1];
  
  return {
    lat: p1.lat + (p2.lat - p1.lat) * segT,
    lon: p1.lon + (p2.lon - p1.lon) * segT,
  };
}

/**
 * Devuelve un punto exacto en la ruta dado un progreso t (0 a 1) basándose en distancia real.
 * @param {string} lineId 
 * @param {number} t Progreso (0 a 1)
 */
function getPuntoExactoEnRuta(lineId, t) {
  const linea = LINEAS_CERCANIAS[lineId];
  if (!linea || linea.puntos.length < 2) {
    return { lat: 40.4058, lon: -3.6903, enParada: false };
  }

  const puntos = linea.puntos;
  let totalDist = 0;
  const dists = [0];
  
  for (let i = 0; i < puntos.length - 1; i++) {
    const p1 = puntos[i];
    const p2 = puntos[i+1];
    const d = Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lon - p1.lon, 2));
    totalDist += d;
    dists.push(totalDist);
  }
  
  const targetDist = t * totalDist;
  
  let segIdx = 0;
  for (let i = 0; i < dists.length - 1; i++) {
    if (targetDist >= dists[i] && targetDist <= dists[i+1]) {
      segIdx = i;
      break;
    }
  }
  if (targetDist > dists[dists.length - 1]) segIdx = dists.length - 2;
  
  const segDist = dists[segIdx + 1] - dists[segIdx];
  const segT = segDist === 0 ? 0 : (targetDist - dists[segIdx]) / segDist;
  
  const p1 = puntos[segIdx];
  const p2 = puntos[segIdx + 1];

  let distToP1 = targetDist - dists[segIdx];
  let distToP2 = dists[segIdx + 1] - targetDist;
  let minDistToStation = Math.min(distToP1, distToP2) / totalDist;
  let enParada = minDistToStation < 0.03; // ~3% de la longitud total es la zona de parada

  return {
    lat: p1.lat + (p2.lat - p1.lat) * segT,
    lon: p1.lon + (p2.lon - p1.lon) * segT,
    enParada
  };
}

/**
 * Extrae el código de línea de una descripción de alerta GTFS-RT.
 * Ejemplos: "#MadC1 Avería" → "C1", "línea C-3" → "C3", "C5 Por obras" → "C5"
 * @param {string} desc
 * @returns {string} lineId o 'CERCANIAS' si no se encuentra
 */
function extraerLineaDeDescripcion(desc) {
  if (!desc) return 'CERCANIAS';
  const match = desc.match(/#Mad[Cc](\d+)|[Ll]ínea\s+[Cc][- ]?(\d+)|[Cc][- ](\d+)\b/);
  if (match) {
    const num = match[1] || match[2] || match[3];
    const lineId = 'C' + num;
    if (LINEAS_CERCANIAS[lineId]) return lineId;
  }
  return 'CERCANIAS';
}

/**
 * Clasifica la severidad de una alerta según su descripción.
 * @param {string} desc
 * @returns {'ALTA'|'MEDIA'|'BAJA'}
 */
function clasificarSeveridad(desc) {
  if (desc.match(/interrumpid|corte|suspendid/i)) return 'ALTA';
  if (desc.match(/retrasos? (importante|fuerte|grave)/i)) return 'ALTA';
  if (desc.match(/retrasos/i)) return 'MEDIA';
  if (desc.match(/aver[ií]a/i)) return 'ALTA';
  if (desc.match(/obras|informaci[oó]n|modificaci[oó]n|alternativo/i)) return 'BAJA';
  return 'MEDIA';
}

// Calcula distancia Haversine en km entre dos coordenadas
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = {
  LINEAS_CERCANIAS,
  getPuntoEnRuta,
  getPuntoExactoEnRuta,
  extraerLineaDeDescripcion,
  clasificarSeveridad,
  haversineDistance
};
