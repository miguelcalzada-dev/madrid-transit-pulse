/**
 * estaciones.ts — Base de datos COMPLETA de Estaciones y Líneas de Cercanías Madrid
 * Fuente: Wikipedia Anexo:Estaciones de Cercanías Madrid + datos oficiales Renfe
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
  estacionesOrdenadas: string[];
  extremoA: string;
  extremoB: string;
}

// ============================================================
// ESTACIONES — Lista completa de todas las estaciones
// ============================================================
export const ESTACIONES: Estacion[] = [

  // ── NODOS PRINCIPALES (compartidos por muchas líneas) ─────
  { id: 'CHAMARTIN',          nombre: 'Chamartín',                 lineas: ['C1','C2','C3','C4','C7','C8','C10'], lat: 40.4720, lon: -3.6795, municipio: 'Madrid' },
  { id: 'ATOCHA',             nombre: 'Atocha',                    lineas: ['C1','C2','C3','C4','C5','C7','C10'], lat: 40.4058, lon: -3.6903, municipio: 'Madrid' },
  { id: 'SOL',                nombre: 'Sol',                       lineas: ['C3','C4'],                           lat: 40.4168, lon: -3.7038, municipio: 'Madrid' },
  { id: 'NUEVOS_MINISTERIOS', nombre: 'Nuevos Ministerios',        lineas: ['C1','C4','C10'],                     lat: 40.4530, lon: -3.6910, municipio: 'Madrid' },
  { id: 'RECOLETOS',          nombre: 'Recoletos',                 lineas: ['C1','C2','C3','C4','C7','C8','C10'], lat: 40.4225, lon: -3.6897, municipio: 'Madrid' },
  { id: 'PRINCIPE_PIO',       nombre: 'Príncipe Pío',              lineas: ['C1','C10'],                          lat: 40.4143, lon: -3.7194, municipio: 'Madrid' },

  // ── LÍNEA C1: Príncipe Pío → Aeropuerto T1-T2-T3 ────────
  // Ramal sur (Príncipe Pío → Atocha)
  { id: 'EMBAJADORES',        nombre: 'Embajadores',               lineas: ['C1','C5'],                           lat: 40.4030, lon: -3.7030, municipio: 'Madrid' },
  { id: 'DELICIAS',           nombre: 'Delicias',                  lineas: ['C1'],                                lat: 40.3990, lon: -3.6950, municipio: 'Madrid' },
  { id: 'MENDEZ_ALVARO',      nombre: 'Méndez Álvaro',             lineas: ['C1','C5'],                           lat: 40.3955, lon: -3.6815, municipio: 'Madrid' },
  // Ramal norte (Chamartín → Aeropuerto)
  { id: 'FUENTE_LA_MORA',     nombre: 'Fuente de la Mora',         lineas: ['C1'],                                lat: 40.5050, lon: -3.6620, municipio: 'Madrid' },
  { id: 'LAS_TABLAS',         nombre: 'Las Tablas',                lineas: ['C1'],                                lat: 40.5180, lon: -3.6582, municipio: 'Madrid' },
  { id: 'PITIS',              nombre: 'Pitis',                     lineas: ['C1','C10'],                          lat: 40.5040, lon: -3.7070, municipio: 'Madrid' },
  { id: 'VALDEBEBAS',         nombre: 'Valdebebas (Aeropuerto T4)',  lineas: ['C1'],                              lat: 40.4970, lon: -3.6173, municipio: 'Madrid' },
  { id: 'AEROPUERTO_T123',    nombre: 'Aeropuerto T1-T2-T3',       lineas: ['C1'],                               lat: 40.4736, lon: -3.5700, municipio: 'Madrid' },
  { id: 'ALCOBENDAS_SANSE',   nombre: 'Alcobendas-SS de los Reyes', lineas: ['C1','C4'],                         lat: 40.5350, lon: -3.6413, municipio: 'Alcobendas' },

  // ── LÍNEA C2: Guadalajara → Atocha ──────────────────────
  { id: 'GUADALAJARA',        nombre: 'Guadalajara',               lineas: ['C2'],                                lat: 40.6327, lon: -3.1669, municipio: 'Guadalajara' },
  { id: 'AZUQUECA',           nombre: 'Azuqueca de Henares',       lineas: ['C2'],                                lat: 40.5630, lon: -3.2630, municipio: 'Azuqueca de Henares' },
  { id: 'ALCALA_HENARES',     nombre: 'Alcalá de Henares',         lineas: ['C2','C7'],                           lat: 40.5500, lon: -3.4000, municipio: 'Alcalá de Henares' },
  { id: 'ALCALA_HENARES_U',   nombre: 'Alcalá de Henares Universidad', lineas: ['C2'],                          lat: 40.5470, lon: -3.3820, municipio: 'Alcalá de Henares' },
  { id: 'MECO',               nombre: 'Meco',                      lineas: ['C2'],                                lat: 40.5590, lon: -3.3290, municipio: 'Meco' },
  { id: 'SANTOS_HUMOSA',      nombre: 'Los Santos de la Humosa',   lineas: ['C2'],                                lat: 40.5300, lon: -3.3650, municipio: 'Los Santos de la Humosa' },
  { id: 'TORREJON',           nombre: 'Torrejón de Ardoz',         lineas: ['C2','C7'],                           lat: 40.4680, lon: -3.4850, municipio: 'Torrejón de Ardoz' },
  { id: 'SOTO_HENARES',       nombre: 'Soto del Henares',          lineas: ['C2'],                                lat: 40.5300, lon: -3.4700, municipio: 'Torrejón de Ardoz' },
  { id: 'SAN_FERNANDO',       nombre: 'San Fernando de Henares',   lineas: ['C2'],                                lat: 40.4330, lon: -3.5230, municipio: 'San Fernando de Henares' },
  { id: 'COSLADA_CENTRAL',    nombre: 'Coslada Central',           lineas: ['C2'],                                lat: 40.4388, lon: -3.5633, municipio: 'Coslada' },
  { id: 'RINCONADA',          nombre: 'La Rinconada',              lineas: ['C2'],                                lat: 40.4470, lon: -3.5360, municipio: 'Madrid' },
  { id: 'PINAR',              nombre: 'Pinar de las Rozas',        lineas: ['C2'],                                lat: 40.4520, lon: -3.5150, municipio: 'Madrid' },

  // ── LÍNEA C3: El Escorial ↔ Aranjuez ────────────────────
  { id: 'EL_ESCORIAL',        nombre: 'El Escorial',               lineas: ['C3'],                                lat: 40.5830, lon: -4.1280, municipio: 'El Escorial' },
  { id: 'LAS_ZORRERAS',       nombre: 'Las Zorreras-Navalagamella', lineas: ['C3'],                              lat: 40.5470, lon: -4.0880, municipio: 'Navalagamella' },
  { id: 'ROBLEDO_CHAVELA',    nombre: 'Robledo de Chavela',        lineas: ['C3'],                                lat: 40.4960, lon: -4.2050, municipio: 'Robledo de Chavela' },
  { id: 'JUAN_CIERVA',        nombre: 'Juan de la Cierva',         lineas: ['C3','C4'],                           lat: 40.3186, lon: -3.7290, municipio: 'Getafe' },
  { id: 'GETAFE_CENTRAL',     nombre: 'Getafe Central',            lineas: ['C3','C4'],                           lat: 40.3094, lon: -3.7325, municipio: 'Getafe' },
  { id: 'GETAFE_IND',         nombre: 'Getafe Industrial',         lineas: ['C3','C4'],                           lat: 40.2960, lon: -3.7320, municipio: 'Getafe' },
  { id: 'SAN_CRISTOBAL_IND',  nombre: 'San Cristóbal Industrial',  lineas: ['C3'],                               lat: 40.2945, lon: -3.6960, municipio: 'Madrid' },
  { id: 'PINTO',              nombre: 'Pinto',                     lineas: ['C3'],                                lat: 40.2440, lon: -3.6990, municipio: 'Pinto' },
  { id: 'VALDEMORO',          nombre: 'Valdemoro',                 lineas: ['C3'],                                lat: 40.1920, lon: -3.6770, municipio: 'Valdemoro' },
  { id: 'CIEMPOZUELOS',       nombre: 'Ciempozuelos',              lineas: ['C3'],                                lat: 40.1630, lon: -3.6230, municipio: 'Ciempozuelos' },
  { id: 'ARANJUEZ',           nombre: 'Aranjuez',                  lineas: ['C3'],                                lat: 40.0302, lon: -3.6046, municipio: 'Aranjuez' },

  // ── LÍNEA C4: Parla ↔ Alcobendas / Colmenar Viejo ───────
  { id: 'PARLA',              nombre: 'Parla',                     lineas: ['C4'],                                lat: 40.2381, lon: -3.7769, municipio: 'Parla' },
  { id: 'HUMANES_C4',         nombre: 'Humanes (C4)',              lineas: ['C4'],                                lat: 40.2640, lon: -3.8180, municipio: 'Humanes de Madrid' },
  { id: 'FUENLABRADA_C4',     nombre: 'Fuenlabrada Central',       lineas: ['C4'],                                lat: 40.2840, lon: -3.7983, municipio: 'Fuenlabrada' },
  { id: 'ZARZAQUEMADA',       nombre: 'Zarzaquemada',              lineas: ['C4','C5'],                           lat: 40.3370, lon: -3.7730, municipio: 'Leganés' },
  { id: 'LEGANES',            nombre: 'Leganés',                   lineas: ['C4','C5'],                           lat: 40.3280, lon: -3.7640, municipio: 'Leganés' },
  { id: 'LEGANES_CENTRAL',    nombre: 'Leganés Central',           lineas: ['C4'],                                lat: 40.3276, lon: -3.7636, municipio: 'Leganés' },
  { id: 'COLMENAR_VIEJO',     nombre: 'Colmenar Viejo',            lineas: ['C4','C10'],                          lat: 40.6605, lon: -3.7670, municipio: 'Colmenar Viejo' },
  { id: 'CANTOBLANCO_U',      nombre: 'Cantoblanco Universidad',   lineas: ['C4','C10'],                          lat: 40.5470, lon: -3.6920, municipio: 'Madrid' },
  { id: 'RAMÓN_Y_CAJAL',      nombre: 'Ramón y Cajal',             lineas: ['C4','C10'],                          lat: 40.5350, lon: -3.6880, municipio: 'Madrid' },

  // ── LÍNEA C5: Móstoles El Soto ↔ Humanes ────────────────
  { id: 'MOSTOLES_EL_SOTO',   nombre: 'Móstoles El Soto',          lineas: ['C5'],                                lat: 40.3080, lon: -3.8820, municipio: 'Móstoles' },
  { id: 'MOSTOLES',           nombre: 'Móstoles',                  lineas: ['C5','C7'],                           lat: 40.3225, lon: -3.8650, municipio: 'Móstoles' },
  { id: 'LAS_RETAMAS',        nombre: 'Las Retamas',               lineas: ['C5'],                                lat: 40.3400, lon: -3.8600, municipio: 'Móstoles' },
  { id: 'ALCORCON',           nombre: 'Alcorcón',                  lineas: ['C5'],                                lat: 40.3600, lon: -3.8340, municipio: 'Alcorcón' },
  { id: 'SAN_JOSE_VALDERAS',  nombre: 'San José de Valderas',      lineas: ['C5'],                                lat: 40.3700, lon: -3.8170, municipio: 'Alcorcón' },
  { id: 'CUATRO_VIENTOS',     nombre: 'Cuatro Vientos',            lineas: ['C5'],                                lat: 40.3730, lon: -3.8060, municipio: 'Alcorcón' },
  { id: 'LAS_AGUILAS',        nombre: 'Las Águilas',               lineas: ['C5'],                                lat: 40.3770, lon: -3.7870, municipio: 'Madrid' },
  { id: 'FANJUL',             nombre: 'Fanjul',                    lineas: ['C5'],                                lat: 40.3870, lon: -3.7680, municipio: 'Madrid' },
  { id: 'ALUCHE',             nombre: 'Aluche',                    lineas: ['C5'],                                lat: 40.3960, lon: -3.7560, municipio: 'Madrid' },
  { id: 'LAGUNA',             nombre: 'Laguna',                    lineas: ['C5'],                                lat: 40.4010, lon: -3.7400, municipio: 'Madrid' },
  // Atocha comparte
  { id: 'DOCE_OCTUBRE',       nombre: 'Doce de Octubre',           lineas: ['C5'],                                lat: 40.3920, lon: -3.6960, municipio: 'Madrid' },
  { id: 'ORCASITAS',          nombre: 'Orcasitas',                 lineas: ['C5'],                                lat: 40.3763, lon: -3.6990, municipio: 'Madrid' },
  { id: 'PUENTE_ALCOCER',     nombre: 'Puente Alcocer',            lineas: ['C5'],                                lat: 40.3640, lon: -3.6995, municipio: 'Madrid' },
  { id: 'VILLAVERDE_ALTO',    nombre: 'Villaverde Alto',           lineas: ['C1','C5'],                           lat: 40.3540, lon: -3.6985, municipio: 'Madrid' },
  { id: 'GETAFE_NORTE',       nombre: 'Getafe Norte',              lineas: ['C5'],                                lat: 40.3160, lon: -3.7690, municipio: 'Getafe' },
  { id: 'PARQUE_POLVORANCA',  nombre: 'Parque Polvoranca',         lineas: ['C5'],                                lat: 40.3260, lon: -3.7770, municipio: 'Leganés' },
  { id: 'LA_SERNA',           nombre: 'La Serna',                  lineas: ['C5'],                                lat: 40.3100, lon: -3.7870, municipio: 'Fuenlabrada' },
  { id: 'FUENLABRADA',        nombre: 'Fuenlabrada',               lineas: ['C5'],                                lat: 40.2940, lon: -3.8000, municipio: 'Fuenlabrada' },
  { id: 'HUMANES',            nombre: 'Humanes',                   lineas: ['C5'],                                lat: 40.2640, lon: -3.8180, municipio: 'Humanes de Madrid' },

  // ── LÍNEA C7: Alcalá de Henares ↔ Príncipe Pío / Móstoles
  { id: 'NAVALCARNERO',       nombre: 'Navalcarnero',              lineas: ['C7'],                                lat: 40.2859, lon: -4.0113, municipio: 'Navalcarnero' },
  { id: 'VILLAVICIOSA',       nombre: 'Villaviciosa de Odón',      lineas: ['C7'],                                lat: 40.3618, lon: -3.9007, municipio: 'Villaviciosa de Odón' },
  { id: 'BOADILLA',           nombre: 'Boadilla del Monte',        lineas: ['C7'],                                lat: 40.4072, lon: -3.8880, municipio: 'Boadilla del Monte' },
  { id: 'BRUNETE',            nombre: 'Brunete',                   lineas: ['C7'],                                lat: 40.4060, lon: -3.9990, municipio: 'Brunete' },
  { id: 'SEVILLA_LA_NUEVA',   nombre: 'Sevilla la Nueva',          lineas: ['C7'],                                lat: 40.3410, lon: -3.9500, municipio: 'Sevilla la Nueva' },
  { id: 'ARROYOMOLINOS',      nombre: 'Arroyomolinos',             lineas: ['C7'],                                lat: 40.3240, lon: -3.9680, municipio: 'Arroyomolinos' },
  { id: 'ZOTOLACHAPARRO',     nombre: 'Zotolachaparro',            lineas: ['C7'],                                lat: 40.3040, lon: -3.9970, municipio: 'Arroyomolinos' },
  { id: 'ALDEA_FRESNO',       nombre: 'Aldea del Fresno',          lineas: ['C7'],                                lat: 40.3300, lon: -4.2380, municipio: 'Aldea del Fresno' },
  { id: 'VILLA_DEL_PRADO',    nombre: 'Villa del Prado',           lineas: ['C7'],                                lat: 40.2970, lon: -4.2800, municipio: 'Villa del Prado' },

  // ── LÍNEA C8: Villalba ↔ Atocha (ramal El Escorial) ─────
  { id: 'VILLALBA',           nombre: 'Collado Villalba',          lineas: ['C8'],                                lat: 40.6313, lon: -4.0033, municipio: 'Collado Villalba' },
  { id: 'GALAPAGAR',          nombre: 'Galapagar-La Navata',       lineas: ['C8'],                                lat: 40.5940, lon: -4.0130, municipio: 'Galapagar' },
  { id: 'TORRELODONES',       nombre: 'Torrelodones',              lineas: ['C8'],                                lat: 40.5700, lon: -3.9330, municipio: 'Torrelodones' },
  { id: 'LAS_MATAS',          nombre: 'Las Matas',                 lineas: ['C8','C10'],                          lat: 40.5050, lon: -3.8870, municipio: 'Las Rozas de Madrid' },
  { id: 'LAS_ROZAS',          nombre: 'Las Rozas',                 lineas: ['C8','C10'],                          lat: 40.4917, lon: -3.8694, municipio: 'Las Rozas de Madrid' },
  { id: 'EL_BARRIAL',         nombre: 'El Barrial-Centro Oeste',   lineas: ['C8'],                                lat: 40.4840, lon: -3.8240, municipio: 'Las Rozas de Madrid' },
  { id: 'MAJADAHONDA',        nombre: 'Majadahonda',               lineas: ['C8','C10'],                          lat: 40.4740, lon: -3.8720, municipio: 'Majadahonda' },
  { id: 'POZUELO',            nombre: 'Pozuelo de Alarcón',        lineas: ['C8','C10'],                          lat: 40.4350, lon: -3.8100, municipio: 'Pozuelo de Alarcón' },
  { id: 'PINAR_CHAMARTIN',    nombre: 'Pinar de Chamartín',        lineas: ['C8'],                                lat: 40.4680, lon: -3.6600, municipio: 'Madrid' },
  // Ramal de Cercedilla desde Villalba:
  { id: 'LOS_NEGRALES',       nombre: 'Los Negrales',              lineas: ['C8'],                                lat: 40.6550, lon: -4.0300, municipio: 'Guadarrama' },
  { id: 'GUADARRAMA',         nombre: 'Guadarrama',                lineas: ['C8'],                                lat: 40.6700, lon: -4.0840, municipio: 'Guadarrama' },
  { id: 'LOS_MOLINOS',        nombre: 'Los Molinos',               lineas: ['C8'],                                lat: 40.7030, lon: -4.0580, municipio: 'Los Molinos' },
  { id: 'CERCEDILLA',         nombre: 'Cercedilla',                lineas: ['C8','C9'],                           lat: 40.7388, lon: -4.0546, municipio: 'Cercedilla' },
  // Ramal de Santa María de la Alameda:
  { id: 'STA_MARIA_ALAMEDA',  nombre: 'Santa María de la Alameda', lineas: ['C8'],                               lat: 40.6400, lon: -4.3200, municipio: 'Santa María de la Alameda' },
  { id: 'ZARZALEJO',          nombre: 'Zarzalejo',                 lineas: ['C8'],                                lat: 40.5640, lon: -4.2070, municipio: 'Zarzalejo' },

  // ── LÍNEA C9: Cercedilla ↔ Cotos / Navacerrada ──────────
  { id: 'NAVACERRADA',        nombre: 'Navacerrada',               lineas: ['C9'],                                lat: 40.7770, lon: -4.0106, municipio: 'Navacerrada' },
  { id: 'COTOS',              nombre: 'Cotos',                     lineas: ['C9'],                                lat: 40.8430, lon: -3.9780, municipio: 'Rascafría' },

  // ── LÍNEA C10: Villalba ↔ Príncipe Pío / Atocha ─────────
  { id: 'MIRAFLORES',         nombre: 'Miraflores de la Sierra',   lineas: ['C10'],                               lat: 40.8090, lon: -3.7690, municipio: 'Miraflores de la Sierra' },
  { id: 'CHOZAS_CANALES',     nombre: 'Chozas de la Sierra',       lineas: ['C10'],                               lat: 40.7500, lon: -3.7550, municipio: 'Soto del Real' },
  { id: 'SOTO_REAL',          nombre: 'Soto del Real',             lineas: ['C10'],                               lat: 40.7210, lon: -3.7690, municipio: 'Soto del Real' },
  { id: 'MANZANARES',         nombre: 'Manzanares el Real',        lineas: ['C10'],                               lat: 40.7280, lon: -3.8650, municipio: 'Manzanares el Real' },
  { id: 'EL_BOALO',           nombre: 'El Boalo-Cerceda-Mataelpino', lineas: ['C10'],                             lat: 40.6900, lon: -3.8090, municipio: 'El Boalo' },
  { id: 'TRES_CANTOS',        nombre: 'Tres Cantos',               lineas: ['C10'],                               lat: 40.5930, lon: -3.7090, municipio: 'Tres Cantos' },
];

// ============================================================
// LÍNEAS — Definición completa con estaciones en orden
// ============================================================
export const LINEAS_CERCANIAS: LineaCercanias[] = [
  {
    id: 'C1',
    nombre: 'Príncipe Pío — Aeropuerto T1-T2-T3',
    color: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
    extremoA: 'Príncipe Pío',
    extremoB: 'Aeropuerto T1-T2-T3',
    estacionesOrdenadas: [
      'PRINCIPE_PIO','EMBAJADORES','DELICIAS','MENDEZ_ALVARO',
      'ATOCHA','RECOLETOS','NUEVOS_MINISTERIOS','CHAMARTIN',
      'PITIS','FUENTE_LA_MORA','LAS_TABLAS','ALCOBENDAS_SANSE',
      'VALDEBEBAS','AEROPUERTO_T123',
    ],
  },
  {
    id: 'C2',
    nombre: 'Guadalajara — Atocha / Chamartín',
    color: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
    extremoA: 'Guadalajara',
    extremoB: 'Atocha',
    estacionesOrdenadas: [
      'GUADALAJARA','AZUQUECA','ALCALA_HENARES','ALCALA_HENARES_U',
      'MECO','SANTOS_HUMOSA','TORREJON','SOTO_HENARES',
      'SAN_FERNANDO','COSLADA_CENTRAL','RINCONADA','PINAR',
      'RECOLETOS','ATOCHA',
    ],
  },
  {
    id: 'C3',
    nombre: 'El Escorial — Aranjuez',
    color: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
    extremoA: 'El Escorial',
    extremoB: 'Aranjuez',
    estacionesOrdenadas: [
      'EL_ESCORIAL','LAS_ZORRERAS','ROBLEDO_CHAVELA',
      'ATOCHA','SOL','RECOLETOS','CHAMARTIN',
      'JUAN_CIERVA','GETAFE_CENTRAL','GETAFE_IND',
      'SAN_CRISTOBAL_IND','PINTO','VALDEMORO','CIEMPOZUELOS','ARANJUEZ',
    ],
  },
  {
    id: 'C4',
    nombre: 'Parla — Alcobendas / Colmenar Viejo',
    color: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
    extremoA: 'Parla',
    extremoB: 'Alcobendas / Colmenar Viejo',
    estacionesOrdenadas: [
      'PARLA','HUMANES_C4','FUENLABRADA_C4','ZARZAQUEMADA','LEGANES',
      'LEGANES_CENTRAL','JUAN_CIERVA','GETAFE_CENTRAL','GETAFE_IND',
      'ATOCHA','SOL','RECOLETOS','NUEVOS_MINISTERIOS','CHAMARTIN',
      'RAMON_Y_CAJAL','CANTOBLANCO_U','ALCOBENDAS_SANSE','COLMENAR_VIEJO',
    ],
  },
  {
    id: 'C5',
    nombre: 'Móstoles El Soto — Humanes',
    color: { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
    extremoA: 'Móstoles El Soto',
    extremoB: 'Humanes',
    estacionesOrdenadas: [
      'MOSTOLES_EL_SOTO','MOSTOLES','LAS_RETAMAS','ALCORCON',
      'SAN_JOSE_VALDERAS','CUATRO_VIENTOS','LAS_AGUILAS','FANJUL',
      'ALUCHE','LAGUNA','EMBAJADORES','ATOCHA','MENDEZ_ALVARO',
      'DOCE_OCTUBRE','ORCASITAS','PUENTE_ALCOCER','VILLAVERDE_ALTO',
      'GETAFE_NORTE','ZARZAQUEMADA','LEGANES','PARQUE_POLVORANCA',
      'LA_SERNA','FUENLABRADA','HUMANES',
    ],
  },
  {
    id: 'C7',
    nombre: 'Alcalá de Henares — Móstoles / Navalcarnero',
    color: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
    extremoA: 'Alcalá de Henares',
    extremoB: 'Móstoles / Navalcarnero',
    estacionesOrdenadas: [
      'ALCALA_HENARES','TORREJON','SAN_FERNANDO','COSLADA_CENTRAL',
      'RECOLETOS','ATOCHA','CHAMARTIN','NUEVOS_MINISTERIOS','PRINCIPE_PIO',
      'ALUCHE','MOSTOLES','ZOTOLACHAPARRO','ARROYOMOLINOS',
      'SEVILLA_LA_NUEVA','BRUNETE','VILLAVICIOSA','BOADILLA',
      'NAVALCARNERO','VILLA_DEL_PRADO','ALDEA_FRESNO',
    ],
  },
  {
    id: 'C8',
    nombre: 'Atocha — Villalba / Cercedilla / El Escorial',
    color: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
    extremoA: 'Atocha',
    extremoB: 'Cercedilla / Villalba',
    estacionesOrdenadas: [
      'ATOCHA','RECOLETOS','CHAMARTIN','PINAR_CHAMARTIN',
      'POZUELO','MAJADAHONDA','EL_BARRIAL','LAS_ROZAS','LAS_MATAS',
      'TORRELODONES','GALAPAGAR','VILLALBA',
      'LOS_NEGRALES','GUADARRAMA','LOS_MOLINOS','CERCEDILLA',
    ],
  },
  {
    id: 'C9',
    nombre: 'Cercedilla — Cotos',
    color: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
    extremoA: 'Cercedilla',
    extremoB: 'Cotos',
    estacionesOrdenadas: ['CERCEDILLA','NAVACERRADA','COTOS'],
  },
  {
    id: 'C10',
    nombre: 'Villalba — Príncipe Pío / Atocha',
    color: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
    extremoA: 'Colmenar Viejo / Miraflores',
    extremoB: 'Príncipe Pío / Atocha',
    estacionesOrdenadas: [
      'MIRAFLORES','CHOZAS_CANALES','SOTO_REAL','MANZANARES','EL_BOALO',
      'COLMENAR_VIEJO','CANTOBLANCO_U','RAMON_Y_CAJAL',
      'CHAMARTIN','NUEVOS_MINISTERIOS','RECOLETOS','ATOCHA',
      'PRINCIPE_PIO','POZUELO','MAJADAHONDA','LAS_ROZAS','LAS_MATAS',
      'TRES_CANTOS','PITIS',
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================

export function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const angleToB = Math.atan2(extremoB.lon - trenLon, extremoB.lat - trenLat) * (180 / Math.PI);
  const normalizedAngle = (angleToB + 360) % 360;
  const angleDiff = Math.abs(((bearing - normalizedAngle + 180 + 360) % 360) - 180);
  const haciaB = angleDiff < 90 || distA < distB;
  return { destino: haciaB ? linea.extremoB : linea.extremoA, haciaB };
}

export function estimarTiempoLlegadaSegundos(
  distanciaMetros: number,
  speedKmh: number,
  delaySeconds: number,
): number | null {
  if (speedKmh <= 2) return null;
  const speedMs = speedKmh / 3.6;
  return Math.round(distanciaMetros / speedMs) + (delaySeconds > 0 ? delaySeconds : 0);
}

export function formatTiempo(segundos: number): string {
  if (segundos < 60) return '<1 min';
  const mins = Math.floor(segundos / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  return `${mins} min`;
}

export const ESTACION_MAP = new Map<string, Estacion>(ESTACIONES.map(e => [e.id, e]));
export const LINEA_MAP = new Map<string, LineaCercanias>(LINEAS_CERCANIAS.map(l => [l.id, l]));
