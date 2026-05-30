/**
 * estaciones.ts — Base de datos completa de Estaciones y Líneas de Cercanías Madrid
 * Incluye coordenadas, líneas por estación y secuencia ordenada de paradas por línea.
 */

export interface Estacion {
  id: string;
  nombre: string;
  lineas: string[];
  lat: number;
  lon: number;
  municipio?: string;
}

export interface LineaCercanias {
  id: string;
  nombre: string;
  color: { bg: string; text: string; border: string };
  /** IDs de estaciones en orden de recorrido (de extremo A a extremo B) */
  estacionesOrdenadas: string[];
  extremoA: string; // nombre del extremo A
  extremoB: string; // nombre del extremo B
}

// ============================================================
// ESTACIONES
// ============================================================
export const ESTACIONES: Estacion[] = [
  // Nodos principales
  { id: 'CHAMARTIN',           nombre: 'Chamartín',                lineas: ['C1','C2','C3','C4','C7','C8','C10'], lat: 40.4720, lon: -3.6795, municipio: 'Madrid' },
  { id: 'ATOCHA',              nombre: 'Atocha',                   lineas: ['C1','C2','C3','C4','C5','C7','C10'], lat: 40.4058, lon: -3.6903, municipio: 'Madrid' },
  { id: 'SOL',                 nombre: 'Sol',                      lineas: ['C3','C4'],                           lat: 40.4168, lon: -3.7038, municipio: 'Madrid' },
  { id: 'NUEVOS_MINISTERIOS',  nombre: 'Nuevos Ministerios',       lineas: ['C1','C4','C10'],                     lat: 40.4530, lon: -3.6910, municipio: 'Madrid' },
  { id: 'PRINCIPE_PIO',        nombre: 'Príncipe Pío',             lineas: ['C1','C10'],                          lat: 40.4143, lon: -3.7194, municipio: 'Madrid' },
  { id: 'RECOLETOS',           nombre: 'Recoletos',                lineas: ['C1','C2','C3','C4','C7','C8','C10'], lat: 40.4225, lon: -3.6897, municipio: 'Madrid' },
  { id: 'CLASICOS',            nombre: 'Clásicos',                 lineas: ['C1','C2','C3','C4','C7','C8','C10'], lat: 40.4330, lon: -3.6850, municipio: 'Madrid' },

  // Línea C1 — Príncipe Pío ↔ Alcobendas-SS de los Reyes
  { id: 'EMBAJADORES',         nombre: 'Embajadores',              lineas: ['C1'],                                lat: 40.4030, lon: -3.7030, municipio: 'Madrid' },
  { id: 'DELICIAS',            nombre: 'Delicias',                 lineas: ['C1'],                                lat: 40.3990, lon: -3.6950, municipio: 'Madrid' },
  { id: 'MENDEZ_ALVARO',       nombre: 'Méndez Álvaro',            lineas: ['C1'],                                lat: 40.3955, lon: -3.6815, municipio: 'Madrid' },
  { id: 'VILLAVERDE_ALTO',     nombre: 'Villaverde Alto',          lineas: ['C1'],                                lat: 40.3540, lon: -3.6985, municipio: 'Madrid' },
  { id: 'VILLAVERDE_BAJO',     nombre: 'Villaverde Bajo',          lineas: ['C1'],                                lat: 40.3640, lon: -3.6960, municipio: 'Madrid' },
  { id: 'SAN_CRISTOBAL',       nombre: 'San Cristóbal de los Ángeles', lineas: ['C1'],                           lat: 40.3762, lon: -3.6902, municipio: 'Madrid' },
  { id: 'FUENTE_LA_MORA',      nombre: 'Fuente de la Mora',        lineas: ['C1'],                                lat: 40.5050, lon: -3.6620, municipio: 'Madrid' },
  { id: 'LAS_TABLAS',          nombre: 'Las Tablas',               lineas: ['C1'],                                lat: 40.5180, lon: -3.6582, municipio: 'Madrid' },
  { id: 'ALCOBENDAS_SANSE',    nombre: 'Alcobendas-SS de los Reyes', lineas: ['C1'],                             lat: 40.5350, lon: -3.6413, municipio: 'Alcobendas' },

  // Línea C2 — Guadalajara ↔ Atocha/Chamartín
  { id: 'GUADALAJARA',         nombre: 'Guadalajara',              lineas: ['C2'],                                lat: 40.6327, lon: -3.1669, municipio: 'Guadalajara' },
  { id: 'AZUQUECA',            nombre: 'Azuqueca de Henares',      lineas: ['C2'],                                lat: 40.5630, lon: -3.2630, municipio: 'Azuqueca' },
  { id: 'ALCALA_HENARES',      nombre: 'Alcalá de Henares',        lineas: ['C2','C7'],                           lat: 40.5500, lon: -3.4000, municipio: 'Alcalá de Henares' },
  { id: 'ALCALA_HENARES_U',    nombre: 'Alcalá de Henares Universidad', lineas: ['C2'],                          lat: 40.5470, lon: -3.3820, municipio: 'Alcalá de Henares' },
  { id: 'MECO',                nombre: 'Meco',                     lineas: ['C2'],                                lat: 40.5590, lon: -3.3290, municipio: 'Meco' },
  { id: 'SANTOS_DE_LA_HUMOSA', nombre: 'Los Santos de la Humosa',  lineas: ['C2'],                                lat: 40.5300, lon: -3.3650, municipio: 'Los Santos de la Humosa' },
  { id: 'COSLADA_CENTRAL',     nombre: 'Coslada Central',          lineas: ['C2'],                                lat: 40.4388, lon: -3.5633, municipio: 'Coslada' },
  { id: 'SAN_FERNANDO',        nombre: 'San Fernando de Henares',  lineas: ['C2'],                                lat: 40.4330, lon: -3.5230, municipio: 'San Fernando de Henares' },
  { id: 'SOTO_DEL_HENARES',    nombre: 'Soto del Henares',         lineas: ['C2'],                                lat: 40.5300, lon: -3.4700, municipio: 'Torrejón de Ardoz' },
  { id: 'TORREJON',            nombre: 'Torrejón de Ardoz',        lineas: ['C2','C7'],                           lat: 40.4680, lon: -3.4850, municipio: 'Torrejón de Ardoz' },
  { id: 'PINAR',               nombre: 'Pinar de las Rozas',       lineas: ['C2'],                                lat: 40.4520, lon: -3.5150, municipio: 'Madrid' },
  { id: 'RINCONADA',           nombre: 'La Rinconada',             lineas: ['C2'],                                lat: 40.4470, lon: -3.5360, municipio: 'Madrid' },

  // Línea C3 — El Escorial / Atocha ↔ Aranjuez
  { id: 'EL_ESCORIAL',         nombre: 'El Escorial',              lineas: ['C3'],                                lat: 40.5830, lon: -4.1280, municipio: 'El Escorial' },
  { id: 'LAS_ZORRERAS',        nombre: 'Las Zorreras-Navalagamella', lineas: ['C3'],                             lat: 40.5470, lon: -4.0880, municipio: 'Navalagamella' },
  { id: 'ROBLEDO_CHAVELA',     nombre: 'Robledo de Chavela',       lineas: ['C3'],                                lat: 40.4960, lon: -4.2050, municipio: 'Robledo de Chavela' },
  { id: 'ARANJUEZ',            nombre: 'Aranjuez',                 lineas: ['C3'],                                lat: 40.0302, lon: -3.6046, municipio: 'Aranjuez' },
  { id: 'CIEMPOZUELOS',        nombre: 'Ciempozuelos',             lineas: ['C3'],                                lat: 40.1630, lon: -3.6230, municipio: 'Ciempozuelos' },
  { id: 'VALDEMORO',           nombre: 'Valdemoro',                lineas: ['C3'],                                lat: 40.1920, lon: -3.6770, municipio: 'Valdemoro' },
  { id: 'PINTO',               nombre: 'Pinto',                    lineas: ['C3'],                                lat: 40.2440, lon: -3.6990, municipio: 'Pinto' },
  { id: 'SAN_CRISTOBAL_IND',   nombre: 'San Cristóbal Industrial', lineas: ['C3'],                               lat: 40.2945, lon: -3.6960, municipio: 'Madrid' },
  { id: 'GETAFE_IND',          nombre: 'Getafe Industrial',        lineas: ['C3','C4'],                           lat: 40.2960, lon: -3.7320, municipio: 'Getafe' },
  { id: 'GETAFE_CENTRAL',      nombre: 'Getafe Central',           lineas: ['C3','C4'],                           lat: 40.3094, lon: -3.7325, municipio: 'Getafe' },
  { id: 'JUAN_DE_LA_CIERVA',   nombre: 'Juan de la Cierva',        lineas: ['C3','C4'],                           lat: 40.3186, lon: -3.7290, municipio: 'Getafe' },

  // Línea C4 — Alcobendas ↔ Parla
  { id: 'PARLA',               nombre: 'Parla',                    lineas: ['C4'],                                lat: 40.2381, lon: -3.7769, municipio: 'Parla' },
  { id: 'PINTO_C4',            nombre: 'Pinto (C4)',               lineas: ['C4'],                                lat: 40.2440, lon: -3.6990, municipio: 'Pinto' },
  { id: 'LEGANES_CENTRAL',     nombre: 'Leganés Central',          lineas: ['C4'],                                lat: 40.3276, lon: -3.7636, municipio: 'Leganés' },
  { id: 'ZARZAQUEMADA',        nombre: 'Zarzaquemada',             lineas: ['C4'],                                lat: 40.3370, lon: -3.7730, municipio: 'Leganés' },
  { id: 'LEGANES',             nombre: 'Leganés',                  lineas: ['C4'],                                lat: 40.3280, lon: -3.7640, municipio: 'Leganés' },
  { id: 'FUENLABRADA',         nombre: 'Fuenlabrada Central',      lineas: ['C4'],                                lat: 40.2840, lon: -3.7983, municipio: 'Fuenlabrada' },
  { id: 'HUMANES',             nombre: 'Humanes',                  lineas: ['C4'],                                lat: 40.2640, lon: -3.8180, municipio: 'Humanes' },

  // Línea C5 — Móstoles El Soto ↔ Atocha (Doble ramal)
  { id: 'MOSTOLES_EL_SOTO',    nombre: 'Móstoles El Soto',         lineas: ['C5'],                                lat: 40.3080, lon: -3.8820, municipio: 'Móstoles' },
  { id: 'MOSTOLES',            nombre: 'Móstoles',                 lineas: ['C5','C7'],                           lat: 40.3225, lon: -3.8650, municipio: 'Móstoles' },
  { id: 'FUENLABRADA_UNI',     nombre: 'Fuenlabrada Universidad',  lineas: ['C5'],                                lat: 40.2960, lon: -3.8260, municipio: 'Fuenlabrada' },
  { id: 'LORANCA',             nombre: 'Loranca',                  lineas: ['C5'],                                lat: 40.3040, lon: -3.8120, municipio: 'Fuenlabrada' },
  { id: 'PARQUE_EUROPA',       nombre: 'Parque Europa',            lineas: ['C5'],                                lat: 40.3050, lon: -3.8000, municipio: 'Fuenlabrada' },
  { id: 'GETAFE_NORTE',        nombre: 'Getafe Norte',             lineas: ['C5'],                                lat: 40.3160, lon: -3.7690, municipio: 'Getafe' },
  { id: 'VIVEROS',             nombre: 'Viveros-La Salud',         lineas: ['C5'],                                lat: 40.3350, lon: -3.7420, municipio: 'Madrid' },

  // Línea C7 — Alcalá de Henares ↔ Príncipe Pío / Móstoles
  { id: 'ALDEA_DEL_FRESNO',    nombre: 'Aldea del Fresno',         lineas: ['C7'],                                lat: 40.3300, lon: -4.2380, municipio: 'Aldea del Fresno' },
  { id: 'VILLA_DEL_PRADO',     nombre: 'Villa del Prado',          lineas: ['C7'],                                lat: 40.2970, lon: -4.2800, municipio: 'Villa del Prado' },
  { id: 'NAVALCARNERO',        nombre: 'Navalcarnero',             lineas: ['C7'],                                lat: 40.2859, lon: -4.0113, municipio: 'Navalcarnero' },
  { id: 'ZOTOLACHAPARRO',      nombre: 'Zotolachaparro',           lineas: ['C7'],                                lat: 40.3040, lon: -3.9970, municipio: 'Arroyomolinos' },
  { id: 'ARROYOMOLINOS',       nombre: 'Arroyomolinos',            lineas: ['C7'],                                lat: 40.3240, lon: -3.9680, municipio: 'Arroyomolinos' },
  { id: 'SEVILLA_LA_NUEVA',    nombre: 'Sevilla la Nueva',         lineas: ['C7'],                                lat: 40.3410, lon: -3.9500, municipio: 'Sevilla la Nueva' },
  { id: 'BRUNETE',             nombre: 'Brunete',                  lineas: ['C7'],                                lat: 40.4060, lon: -3.9990, municipio: 'Brunete' },
  { id: 'VILLAVICIOSA',        nombre: 'Villaviciosa de Odón',     lineas: ['C7'],                                lat: 40.3618, lon: -3.9007, municipio: 'Villaviciosa de Odón' },
  { id: 'BOADILLA',            nombre: 'Boadilla del Monte',       lineas: ['C7'],                                lat: 40.4072, lon: -3.8880, municipio: 'Boadilla del Monte' },
  { id: 'POZUELO',             nombre: 'Pozuelo de Alarcón',       lineas: ['C10'],                               lat: 40.4350, lon: -3.8100, municipio: 'Pozuelo de Alarcón' },

  // Línea C8 — Atocha ↔ Villalba / El Escorial
  { id: 'VILLALBA',            nombre: 'Collado Villalba',         lineas: ['C8'],                                lat: 40.6313, lon: -4.0033, municipio: 'Collado Villalba' },
  { id: 'LAS_ROZAS',           nombre: 'Las Rozas',                lineas: ['C8','C10'],                          lat: 40.4917, lon: -3.8694, municipio: 'Las Rozas de Madrid' },
  { id: 'PINAR_LLANO',         nombre: 'Pinar de Chamartín',       lineas: ['C8'],                                lat: 40.4680, lon: -3.6600, municipio: 'Madrid' },
  { id: 'MAJADAHONDA',         nombre: 'Majadahonda',              lineas: ['C8','C10'],                          lat: 40.4740, lon: -3.8720, municipio: 'Majadahonda' },
  { id: 'EL_BARRIAL',          nombre: 'El Barrial-Centro Oeste',  lineas: ['C8'],                                lat: 40.4840, lon: -3.8240, municipio: 'Las Rozas de Madrid' },
  { id: 'LAS_MATAS',           nombre: 'Las Matas',                lineas: ['C8','C10'],                          lat: 40.5050, lon: -3.8870, municipio: 'Las Rozas de Madrid' },
  { id: 'TORRELODONES',        nombre: 'Torrelodones',             lineas: ['C8'],                                lat: 40.5700, lon: -3.9330, municipio: 'Torrelodones' },
  { id: 'GALAPAGAR',           nombre: 'Galapagar-La Navata',      lineas: ['C8'],                                lat: 40.5940, lon: -4.0130, municipio: 'Galapagar' },

  // Línea C9 — Cercedilla ↔ Cotos / Navacerrada
  { id: 'CERCEDILLA',          nombre: 'Cercedilla',               lineas: ['C9'],                                lat: 40.7388, lon: -4.0546, municipio: 'Cercedilla' },
  { id: 'NAVACERRADA',         nombre: 'Navacerrada',              lineas: ['C9'],                                lat: 40.7770, lon: -4.0106, municipio: 'Navacerrada' },
  { id: 'COTOS',               nombre: 'Cotos',                    lineas: ['C9'],                                lat: 40.8430, lon: -3.9780, municipio: 'Rascafría' },
  { id: 'LOS_COTOS',           nombre: 'Los Cotos',                lineas: ['C9'],                                lat: 40.8450, lon: -3.9680, municipio: 'Rascafría' },

  // Línea C10 — Villalba ↔ Príncipe Pío / Atocha
  { id: 'TRES_CANTOS',         nombre: 'Tres Cantos',              lineas: ['C10'],                               lat: 40.5930, lon: -3.7090, municipio: 'Tres Cantos' },
  { id: 'COLMENAR_VIEJO',      nombre: 'Colmenar Viejo',           lineas: ['C10'],                               lat: 40.6605, lon: -3.7670, municipio: 'Colmenar Viejo' },
  { id: 'MIRAFLORES',          nombre: 'Miraflores de la Sierra',  lineas: ['C10'],                               lat: 40.8090, lon: -3.7690, municipio: 'Miraflores de la Sierra' },
  { id: 'PITIS',               nombre: 'Pitis',                    lineas: ['C1','C10'],                          lat: 40.5040, lon: -3.7070, municipio: 'Madrid' },
  { id: 'VALDEBEBAS',          nombre: 'Valdebebas (Aeropuerto T4)', lineas: ['C1'],                              lat: 40.4970, lon: -3.6173, municipio: 'Madrid' },
  { id: 'AEROPUERTO_T123',     nombre: 'Aeropuerto T1-T2-T3',      lineas: ['C1'],                               lat: 40.4736, lon: -3.5700, municipio: 'Madrid' },
];

// ============================================================
// LÍNEAS
// ============================================================
export const LINEAS_CERCANIAS: LineaCercanias[] = [
  {
    id: 'C1',
    nombre: 'Príncipe Pío — Aeropuerto T4',
    color: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
    extremoA: 'Príncipe Pío',
    extremoB: 'Aeropuerto T1-T2-T3',
    estacionesOrdenadas: ['PRINCIPE_PIO','EMBAJADORES','DELICIAS','MENDEZ_ALVARO','ATOCHA','RECOLETOS','CLASICOS','NUEVOS_MINISTERIOS','CHAMARTIN','PITIS','FUENTE_LA_MORA','LAS_TABLAS','ALCOBENDAS_SANSE','VALDEBEBAS','AEROPUERTO_T123'],
  },
  {
    id: 'C2',
    nombre: 'Guadalajara — Atocha',
    color: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
    extremoA: 'Guadalajara',
    extremoB: 'Atocha',
    estacionesOrdenadas: ['GUADALAJARA','AZUQUECA','ALCALA_HENARES','ALCALA_HENARES_U','MECO','SANTOS_DE_LA_HUMOSA','TORREJON','SOTO_DEL_HENARES','SAN_FERNANDO','COSLADA_CENTRAL','RINCONADA','PINAR','RECOLETOS','CLASICOS','ATOCHA'],
  },
  {
    id: 'C3',
    nombre: 'El Escorial — Aranjuez',
    color: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
    extremoA: 'El Escorial',
    extremoB: 'Aranjuez',
    estacionesOrdenadas: ['EL_ESCORIAL','LAS_ZORRERAS','ROBLEDO_CHAVELA','ATOCHA','SOL','CLASICOS','RECOLETOS','CHAMARTIN','JUAN_DE_LA_CIERVA','GETAFE_CENTRAL','GETAFE_IND','SAN_CRISTOBAL_IND','PINTO','VALDEMORO','CIEMPOZUELOS','ARANJUEZ'],
  },
  {
    id: 'C4',
    nombre: 'Alcobendas — Parla',
    color: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
    extremoA: 'Alcobendas',
    extremoB: 'Parla',
    estacionesOrdenadas: ['ALCOBENDAS_SANSE','CHAMARTIN','NUEVOS_MINISTERIOS','RECOLETOS','SOL','ATOCHA','JUAN_DE_LA_CIERVA','GETAFE_CENTRAL','GETAFE_IND','LEGANES','LEGANES_CENTRAL','ZARZAQUEMADA','FUENLABRADA','HUMANES','PARLA'],
  },
  {
    id: 'C5',
    nombre: 'Móstoles El Soto — Atocha',
    color: { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
    extremoA: 'Móstoles El Soto',
    extremoB: 'Atocha',
    estacionesOrdenadas: ['MOSTOLES_EL_SOTO','MOSTOLES','FUENLABRADA_UNI','LORANCA','PARQUE_EUROPA','GETAFE_NORTE','JUAN_DE_LA_CIERVA','VIVEROS','ATOCHA'],
  },
  {
    id: 'C7',
    nombre: 'Alcalá de Henares — Alcalá de Henares (circular)',
    color: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
    extremoA: 'Alcalá de Henares',
    extremoB: 'Príncipe Pío / Móstoles',
    estacionesOrdenadas: ['ALCALA_HENARES','TORREJON','RECOLETOS','CLASICOS','CHAMARTIN','NUEVOS_MINISTERIOS','PRINCIPE_PIO','MOSTOLES','NAVALCARNERO','VILLAVICIOSA','BOADILLA','ARROYOMOLINOS','SEVILLA_LA_NUEVA','BRUNETE'],
  },
  {
    id: 'C8',
    nombre: 'Villalba — Atocha',
    color: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
    extremoA: 'Collado Villalba',
    extremoB: 'Atocha',
    estacionesOrdenadas: ['VILLALBA','GALAPAGAR','TORRELODONES','LAS_MATAS','LAS_ROZAS','EL_BARRIAL','MAJADAHONDA','PINAR_LLANO','CLASICOS','RECOLETOS','ATOCHA'],
  },
  {
    id: 'C9',
    nombre: 'Cercedilla — Cotos',
    color: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
    extremoA: 'Cercedilla',
    extremoB: 'Cotos / Navacerrada',
    estacionesOrdenadas: ['CERCEDILLA','NAVACERRADA','COTOS','LOS_COTOS'],
  },
  {
    id: 'C10',
    nombre: 'Villalba — Príncipe Pío',
    color: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
    extremoA: 'Villalba',
    extremoB: 'Príncipe Pío / Atocha',
    estacionesOrdenadas: ['COLMENAR_VIEJO','TRES_CANTOS','CHAMARTIN','NUEVOS_MINISTERIOS','CLASICOS','RECOLETOS','PRINCIPE_PIO','POZUELO','MAJADAHONDA','LAS_MATAS','LAS_ROZAS'],
  },
];

// ============================================================
// HELPERS
// ============================================================

/** Distancia Haversine en metros entre dos puntos geográficos */
export function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Calcula el sentido del tren (extremo al que se dirige) basándose en su bearing y posición en la línea */
export function calcularDireccion(
  linea: LineaCercanias,
  trenLat: number,
  trenLon: number,
  bearing: number,
): { destino: string; haciaB: boolean } {
  const estaciones = linea.estacionesOrdenadas
    .map(id => ESTACIONES.find(e => e.id === id))
    .filter(Boolean) as Estacion[];

  if (estaciones.length < 2) return { destino: linea.extremoB, haciaB: true };

  const extremoA = estaciones[0];
  const extremoB = estaciones[estaciones.length - 1];

  const distA = haversineMetros(trenLat, trenLon, extremoA.lat, extremoA.lon);
  const distB = haversineMetros(trenLat, trenLon, extremoB.lat, extremoB.lon);

  // Usar bearing para distinguir dirección cuando las distancias son similares
  // Calculamos el ángulo hacia A y hacia B desde la posición del tren
  const angleToB = Math.atan2(extremoB.lon - trenLon, extremoB.lat - trenLat) * (180 / Math.PI);
  const normalizedAngle = (angleToB + 360) % 360;
  const angleDiff = Math.abs(((bearing - normalizedAngle + 180 + 360) % 360) - 180);

  // Si el ángulo del tren se acerca a B (< 90° de diferencia), va hacia B
  const haciaB = angleDiff < 90 || (distA < distB);

  return {
    destino: haciaB ? linea.extremoB : linea.extremoA,
    haciaB,
  };
}

/** Estima el tiempo de llegada en segundos. Retorna null si no se puede calcular. */
export function estimarTiempoLlegadaSegundos(
  distanciaMetros: number,
  speedKmh: number,
  delaySeconds: number,
): number | null {
  if (speedKmh <= 2) return null; // tren parado
  const speedMs = speedKmh / 3.6;
  return Math.round(distanciaMetros / speedMs) + (delaySeconds > 0 ? delaySeconds : 0);
}

/** Formatea segundos en texto legible: "2 min", "1 min 30 s", "<1 min" */
export function formatTiempo(segundos: number): string {
  if (segundos < 60) return '<1 min';
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min`;
}

export const ESTACION_MAP = new Map<string, Estacion>(ESTACIONES.map(e => [e.id, e]));
export const LINEA_MAP = new Map<string, LineaCercanias>(LINEAS_CERCANIAS.map(l => [l.id, l]));
