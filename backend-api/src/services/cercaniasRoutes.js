/**
 * cercaniasRoutes.js
 * Definición estática de las rutas de Cercanías Madrid:
 * orden de estaciones + tiempos de viaje entre paradas consecutivas.
 *
 * Fuente: Horarios oficiales Renfe Cercanías Madrid.
 * Se usa para proyectar la posición actual de un tren a todas sus
 * paradas futuras (y pasadas), replicando el panel de Google Maps.
 *
 * Cada parada tiene:
 *   estId    → ID interno (coincide con ESTACIONES[] del frontend)
 *   stopIds  → todos los stop_id GTFS conocidos para esa estación en esa línea
 *   min      → minutos ACUMULADOS desde el primer elemento de la lista
 */

'use strict';

// Ayuda a construir el array de paradas con min acumulados
function buildRoute(stops) {
  let acc = 0;
  return stops.map(({ estId, stopIds, travel }) => {
    const min = acc;
    acc += travel;
    return { estId, stopIds, min };
  });
}

const ROUTES = {

  // ──────────────────────────────────────────────────────
  // C1: Príncipe Pío ↔ Aeropuerto T1-T2-T3
  // ──────────────────────────────────────────────────────
  C1: buildRoute([
    { estId: 'PRINCIPE_PIO',    stopIds: ['50602','98003','69101'],                                                        travel: 0  },
    { estId: 'EMBAJADORES',     stopIds: ['50700','98304','69105','51100'],                                                travel: 2  },
    { estId: 'DELICIAS',        stopIds: ['51111','69107'],                                                                travel: 2  },
    { estId: 'MENDEZ_ALVARO',   stopIds: ['51112','98305','69110','69104','50704'],                                        travel: 2  },
    { estId: 'ATOCHA',          stopIds: ['62109','13205','14203','51003','13208'],                                        travel: 5  },
    { estId: 'RECOLETOS',       stopIds: ['51113','10005','97201'],                                                        travel: 3  },
    { estId: 'NUEVOS_MINISTERIOS', stopIds: ['51200','10007'],                                                            travel: 3  },
    { estId: 'CHAMARTIN',       stopIds: ['51300','10000','18002','97100'],                                                travel: 5  },
    { estId: 'PITIS',           stopIds: ['06002','51458','78704'],                                                       travel: 7  },
    { estId: 'FUENTE_LA_MORA',  stopIds: ['05952','51401','51404','51405','51406'],                                       travel: 3  },
    { estId: 'LAS_TABLAS',      stopIds: ['05961','51414','11518','51415','51407'],                                       travel: 3  },
    { estId: 'ALCOBENDAS_SANSE',stopIds: ['05967','51417','11505','11501','11502','11507','11511','11512'],               travel: 5  },
    { estId: 'VALDEBEBAS',      stopIds: ['05969','51419','11509','70807','11406','11408'],                               travel: 5  },
    { estId: 'AEROPUERTO_T123', stopIds: ['05975','51451','11404','70801','51452','51455','14212','14217','14230','14233'], travel: 12 },
  ]),

  // ──────────────────────────────────────────────────────
  // C2: Guadalajara ↔ Atocha / Chamartín
  // ──────────────────────────────────────────────────────
  C2: buildRoute([
    { estId: 'GUADALAJARA',       stopIds: ['65000','14218','70200'],                                             travel: 0  },
    { estId: 'AZUQUECA',          stopIds: ['14214'],                                                             travel: 15 },
    { estId: 'ALCALA_HENARES',    stopIds: ['14204','70100','64202','64200'],                                     travel: 15 },
    { estId: 'ALCALA_HENARES_U',  stopIds: ['13505','64203','70105','13504','13507','14211'],                    travel: 4  },
    { estId: 'MECO',              stopIds: ['13403','64107','13405','64004','64006'],                            travel: 8  },
    { estId: 'SANTOS_HUMOSA',     stopIds: ['13502','13501'],                                                    travel: 7  },
    { estId: 'TORREJON',          stopIds: ['70002','64100','13404','64102'],                                    travel: 8  },
    { estId: 'SOTO_HENARES',      stopIds: ['70108','64105','43000','43026'],                                    travel: 4  },
    { estId: 'SAN_FERNANDO',      stopIds: ['62109','13205','13206','13207','62100','62003','62104'],            travel: 7  },
    { estId: 'COSLADA_CENTRAL',   stopIds: ['62101','13304','13303'],                                           travel: 4  },
    { estId: 'RINCONADA',         stopIds: ['62102','13305'],                                                    travel: 3  },
    { estId: 'PINAR',             stopIds: ['13400','06005'],                                                    travel: 3  },
    { estId: 'RECOLETOS',         stopIds: ['10005','18001','97201'],                                            travel: 10 },
    { estId: 'ATOCHA',            stopIds: ['18000','17000'],                                                    travel: 3  },
    { estId: 'CHAMARTIN',         stopIds: ['18002','10000'],                                                    travel: 10 },
  ]),

  // ──────────────────────────────────────────────────────
  // C3: El Escorial ↔ Aranjuez
  // ──────────────────────────────────────────────────────
  C3: buildRoute([
    { estId: 'EL_ESCORIAL',       stopIds: ['05104'],                                              travel: 0  },
    { estId: 'LAS_ZORRERAS',      stopIds: ['05106'],                                              travel: 12 },
    { estId: 'ROBLEDO_CHAVELA',   stopIds: ['05123'],                                              travel: 15 },
    { estId: 'ZARZALEJO',         stopIds: ['05805'],                                              travel: 10 },
    { estId: 'CHAMARTIN',         stopIds: ['18002','10000','60104'],                              travel: 55 },
    { estId: 'RECOLETOS',         stopIds: ['60103','10005'],                                     travel: 4  },
    { estId: 'ATOCHA',            stopIds: ['17000','60101','18000'],                              travel: 3  },
    { estId: 'SOL',               stopIds: ['60100','18003'],                                     travel: 3  },
    { estId: 'JUAN_CIERVA',       stopIds: ['60105','17001','72400'],                              travel: 10 },
    { estId: 'GETAFE_CENTRAL',    stopIds: ['13119','17004','72305'],                              travel: 3  },
    { estId: 'GETAFE_IND',        stopIds: ['13116','72303','13118','13115'],                     travel: 2  },
    { estId: 'SAN_CRISTOBAL_IND', stopIds: ['13113','13120','13121'],                             travel: 3  },
    { estId: 'PINTO',             stopIds: ['13111','60914'],                                     travel: 5  },
    { estId: 'VALDEMORO',         stopIds: ['13109','66208','66206','66211','66212'],              travel: 6  },
    { estId: 'CIEMPOZUELOS',      stopIds: ['13108','40113','13106','13107'],                     travel: 7  },
    { estId: 'ARANJUEZ',          stopIds: ['13104','13100'],                                     travel: 15 },
  ]),

  // ──────────────────────────────────────────────────────
  // C4a: Parla ↔ Alcobendas-San Sebastián de los Reyes
  // ──────────────────────────────────────────────────────
  C4a: buildRoute([
    { estId: 'PARLA',             stopIds: ['72201','37010'],                                     travel: 0  },
    { estId: 'HUMANES_C4',        stopIds: ['72206','72205','72207','72209'],                     travel: 8  },
    { estId: 'FUENLABRADA_C4',    stopIds: ['72210','72211'],                                     travel: 5  },
    { estId: 'LEGANES_CENTRAL',   stopIds: ['72300','72301'],                                     travel: 5  },
    { estId: 'LEGANES',           stopIds: ['72302','18101','71709'],                             travel: 3  },
    { estId: 'ZARZAQUEMADA',      stopIds: ['19002','71801'],                                     travel: 3  },
    { estId: 'GETAFE_IND',        stopIds: ['13116','72303'],                                     travel: 5  },
    { estId: 'GETAFE_CENTRAL',    stopIds: ['13119','17004','72305'],                             travel: 2  },
    { estId: 'JUAN_CIERVA',       stopIds: ['60105','17001','72400','17003','17009'],             travel: 3  },
    { estId: 'ATOCHA',            stopIds: ['17000','51003'],                                     travel: 8  },
    { estId: 'SOL',               stopIds: ['60100','18003'],                                     travel: 3  },
    { estId: 'RECOLETOS',         stopIds: ['10005','97201'],                                     travel: 3  },
    { estId: 'NUEVOS_MINISTERIOS',stopIds: ['51200','10007','65209','18004'],                     travel: 3  },
    { estId: 'CHAMARTIN',         stopIds: ['10000','18002','97100'],                             travel: 5  },
    { estId: 'RAMÓN_Y_CAJAL',     stopIds: ['78703','65204'],                                     travel: 5  },
    { estId: 'CANTOBLANCO_U',     stopIds: ['78700','65202'],                                     travel: 3  },
    { estId: 'ALCOBENDAS_SANSE',  stopIds: ['05967','05465','05467','05483'],                     travel: 7  },
  ]),

  // ──────────────────────────────────────────────────────
  // C4b: Parla ↔ Colmenar Viejo
  // ──────────────────────────────────────────────────────
  C4b: buildRoute([
    { estId: 'PARLA',             stopIds: ['72201','37010'],                                     travel: 0  },
    { estId: 'HUMANES_C4',        stopIds: ['72206','72205','72207','72209'],                     travel: 8  },
    { estId: 'FUENLABRADA_C4',    stopIds: ['72210','72211'],                                     travel: 5  },
    { estId: 'LEGANES_CENTRAL',   stopIds: ['72300','72301'],                                     travel: 5  },
    { estId: 'LEGANES',           stopIds: ['72302','18101','71709'],                             travel: 3  },
    { estId: 'ZARZAQUEMADA',      stopIds: ['19002','71801'],                                     travel: 3  },
    { estId: 'GETAFE_IND',        stopIds: ['13116','72303'],                                     travel: 5  },
    { estId: 'GETAFE_CENTRAL',    stopIds: ['13119','17004','72305'],                             travel: 2  },
    { estId: 'JUAN_CIERVA',       stopIds: ['60105','17001','72400','17003','17009'],             travel: 3  },
    { estId: 'ATOCHA',            stopIds: ['17000','51003'],                                     travel: 8  },
    { estId: 'SOL',               stopIds: ['60100','18003'],                                     travel: 3  },
    { estId: 'RECOLETOS',         stopIds: ['10005','97201'],                                     travel: 3  },
    { estId: 'NUEVOS_MINISTERIOS',stopIds: ['51200','10007','65209','18004'],                     travel: 3  },
    { estId: 'CHAMARTIN',         stopIds: ['10000','18002','97100'],                             travel: 5  },
    { estId: 'RAMÓN_Y_CAJAL',     stopIds: ['78703','65204'],                                     travel: 5  },
    { estId: 'CANTOBLANCO_U',     stopIds: ['78700','65202'],                                     travel: 3  },
    { estId: 'COLMENAR_VIEJO',    stopIds: ['65002','76003'],                                     travel: 12 },
  ]),

  // ──────────────────────────────────────────────────────
  // C5: Móstoles El Soto ↔ Humanes (circular via Atocha)
  // ──────────────────────────────────────────────────────
  C5: buildRoute([
    { estId: 'MOSTOLES_EL_SOTO',  stopIds: ['35001','35002','71701'],                                 travel: 0  },
    { estId: 'MOSTOLES',          stopIds: ['35009','35010','35011','35012','71700','79601'],         travel: 4  },
    { estId: 'LAS_RETAMAS',       stopIds: ['71602'],                                            travel: 3  },
    { estId: 'ALCORCON',          stopIds: ['71601'],                                            travel: 3  },
    { estId: 'SAN_JOSE_VALDERAS', stopIds: ['71600'],                                           travel: 3  },
    { estId: 'CUATRO_VIENTOS',    stopIds: ['43004','43003','43026'],                            travel: 3  },
    { estId: 'LAS_AGUILAS',       stopIds: ['71401','37012','71211'],                            travel: 3  },
    { estId: 'FANJUL',            stopIds: ['37001'],                                            travel: 2  },
    { estId: 'ALUCHE',            stopIds: ['37002','71502','71802','71500'],                    travel: 2  },
    { estId: 'LAGUNA',            stopIds: ['37011','71503'],                                    travel: 3  },
    { estId: 'EMBAJADORES',       stopIds: ['50700','98304','51100'],                            travel: 5  },
    { estId: 'ATOCHA',            stopIds: ['18000','17000','51003'],                            travel: 4  },
    { estId: 'MENDEZ_ALVARO',     stopIds: ['51112','98305','69110','69104','50704'],            travel: 3  },
    { estId: 'DOCE_OCTUBRE',      stopIds: ['35704'],                                            travel: 3  },
    { estId: 'ORCASITAS',         stopIds: ['35610'],                                            travel: 3  },
    { estId: 'PUENTE_ALCOCER',    stopIds: ['35702'],                                            travel: 3  },
    { estId: 'VILLAVERDE_ALTO',   stopIds: ['35609','60911'],                                   travel: 3  },
    { estId: 'GETAFE_NORTE',      stopIds: ['35608','71708'],                                   travel: 3  },
    { estId: 'ZARZAQUEMADA',      stopIds: ['19002','71801'],                                     travel: 3  },
    { estId: 'LEGANES',           stopIds: ['72302','18101','71709'],                             travel: 3  },
    { estId: 'PARQUE_POLVORANCA', stopIds: ['35606','71707'],                                   travel: 3  },
    { estId: 'LA_SERNA',          stopIds: ['35605','71706'],                                   travel: 3  },
    { estId: 'FUENLABRADA',       stopIds: ['35604','71705','67212','35602','35603','35607'],    travel: 3  },
    { estId: 'HUMANES',           stopIds: ['35601','71703','05487'],                            travel: 7  },
  ]),

  // ──────────────────────────────────────────────────────
  // C7: Alcalá de Henares ↔ Navalcarnero / Móstoles
  // ──────────────────────────────────────────────────────
  C7: buildRoute([
    { estId: 'ALCALA_HENARES',    stopIds: ['14204','70100','64202'],                            travel: 0  },
    { estId: 'ALCALA_HENARES_U',  stopIds: ['70105'],                                           travel: 4  },
    { estId: 'SOTO_HENARES',      stopIds: ['70108','70109'],                                   travel: 8  },
    { estId: 'TORREJON',          stopIds: ['70002','64100','70101'],                           travel: 6  },
    { estId: 'SAN_FERNANDO',      stopIds: ['62109','70112'],                                   travel: 8  },
    { estId: 'COSLADA_CENTRAL',   stopIds: ['62101'],                                           travel: 4  },
    { estId: 'CHAMARTIN',         stopIds: ['10000','97100'],                                   travel: 12 },
    { estId: 'RECOLETOS',         stopIds: ['10005','97201'],                                   travel: 4  },
    { estId: 'ATOCHA',            stopIds: ['17000','18000'],                                   travel: 3  },
    { estId: 'MOSTOLES',          stopIds: ['70111','71700','79601'],                           travel: 30 },
    { estId: 'NAVALCARNERO',      stopIds: ['70102','79102','79605','70103','79103'],           travel: 15 },
    { estId: 'VILLAVICIOSA',      stopIds: ['79104','79501'],                                   travel: 8  },
    { estId: 'BRUNETE',           stopIds: ['79412'],                                           travel: 10 },
    { estId: 'ARROYOMOLINOS',     stopIds: ['79409'],                                           travel: 5  },
    { estId: 'SEVILLA_LA_NUEVA',  stopIds: ['79410'],                                          travel: 5  },
    { estId: 'ZOTOLACHAPARRO',    stopIds: ['79407'],                                           travel: 5  },
    { estId: 'VILLA_DEL_PRADO',   stopIds: ['79405','79607'],                                  travel: 8  },
    { estId: 'ALDEA_FRESNO',      stopIds: ['79403'],                                           travel: 8  },
  ]),

  // ──────────────────────────────────────────────────────
  // C8a: El Escorial ↔ Atocha
  // ──────────────────────────────────────────────────────
  C8a: buildRoute([
    { estId: 'EL_ESCORIAL',       stopIds: ['05104'],                                                           travel: 0  },
    { estId: 'LAS_ZORRERAS',      stopIds: ['05106'],                                                           travel: 12 },
    { estId: 'ROBLEDO_CHAVELA',   stopIds: ['05123'],                                                           travel: 15 },
    { estId: 'ZARZALEJO',         stopIds: ['05805'],                                                           travel: 10 },
    { estId: 'VILLALBA',          stopIds: ['79100','05621'],                                                   travel: 8  },
    { estId: 'GALAPAGAR',         stopIds: ['78805','05622'],                                                  travel: 12 },
    { estId: 'TORRELODONES',      stopIds: ['78806','54508','05623','54501','54503','54510','54519'],           travel: 8  },
    { estId: 'LAS_MATAS',         stopIds: ['78705','54511','05652','05655','05663'],                          travel: 8  },
    { estId: 'LAS_ROZAS',         stopIds: ['78707','54515','05657'],                                          travel: 4  },
    { estId: 'MAJADAHONDA',       stopIds: ['78709','54520','05658'],                                          travel: 4  },
    { estId: 'EL_BARRIAL',        stopIds: ['78804','10100','05672'],                                          travel: 4  },
    { estId: 'POZUELO',           stopIds: ['78710','05673'],                                                  travel: 5  },
    { estId: 'PINAR_CHAMARTIN',   stopIds: ['05768','10001','05767','05797','10103','78600'],                  travel: 15 },
    { estId: 'CHAMARTIN',         stopIds: ['10000','97100'],                                                  travel: 5  },
    { estId: 'RECOLETOS',         stopIds: ['10005','97201'],                                                  travel: 4  },
    { estId: 'ATOCHA',            stopIds: ['17000','18000'],                                                  travel: 3  },
  ]),

  // ──────────────────────────────────────────────────────
  // C8b: Cercedilla ↔ Atocha
  // ──────────────────────────────────────────────────────
  C8b: buildRoute([
    { estId: 'CERCEDILLA',        stopIds: ['05474','12020','79007'],                                            travel: 0  },
    { estId: 'LOS_MOLINOS',       stopIds: ['05484','79006','12004'],                                           travel: 15 },
    { estId: 'GUADARRAMA',        stopIds: ['05489','79005'],                                                   travel: 5  },
    { estId: 'LOS_NEGRALES',      stopIds: ['05613','79004'],                                                  travel: 7  },
    { estId: 'VILLALBA',          stopIds: ['79100','05621'],                                                   travel: 8  },
    { estId: 'GALAPAGAR',         stopIds: ['78805','05622'],                                                  travel: 12 },
    { estId: 'TORRELODONES',      stopIds: ['78806','54508','05623','54501','54503','54510','54519'],           travel: 8  },
    { estId: 'LAS_MATAS',         stopIds: ['78705','54511','05652','05655','05663'],                          travel: 8  },
    { estId: 'LAS_ROZAS',         stopIds: ['78707','54515','05657'],                                          travel: 4  },
    { estId: 'MAJADAHONDA',       stopIds: ['78709','54520','05658'],                                          travel: 4  },
    { estId: 'EL_BARRIAL',        stopIds: ['78804','10100','05672'],                                          travel: 4  },
    { estId: 'POZUELO',           stopIds: ['78710','05673'],                                                  travel: 5  },
    { estId: 'PINAR_CHAMARTIN',   stopIds: ['05768','10001','05767','05797','10103','78600'],                  travel: 15 },
    { estId: 'CHAMARTIN',         stopIds: ['10000','97100'],                                                  travel: 5  },
    { estId: 'RECOLETOS',         stopIds: ['10005','97201'],                                                  travel: 4  },
    { estId: 'ATOCHA',            stopIds: ['17000','18000'],                                                  travel: 3  },
  ]),

  // ──────────────────────────────────────────────────────
  // C9: Cercedilla ↔ Cotos / Navacerrada
  // ──────────────────────────────────────────────────────
  C9: buildRoute([
    { estId: 'CERCEDILLA',        stopIds: ['05474','12020','79007'],              travel: 0  },
    { estId: 'NAVACERRADA',       stopIds: ['05602','79009'],                      travel: 20 },
    { estId: 'COTOS',             stopIds: ['05605','79011'],                      travel: 25 },
  ]),

  // ──────────────────────────────────────────────────────
  // C10: Chamartín ↔ Villalba / Miraflores (ramal norte)
  // ──────────────────────────────────────────────────────
  C10: buildRoute([
    { estId: 'CHAMARTIN',         stopIds: ['10000','18002'],                                                   travel: 0  },
    { estId: 'NUEVOS_MINISTERIOS',stopIds: ['10007','18004','65209'],                                          travel: 5  },
    { estId: 'PITIS',             stopIds: ['06002','78704','51458'],                                          travel: 7  },
    { estId: 'LAS_MATAS',         stopIds: ['78705','54511','05652'],                                         travel: 8  },
    { estId: 'LAS_ROZAS',         stopIds: ['78707','54515','05657'],                                         travel: 4  },
    { estId: 'MAJADAHONDA',       stopIds: ['78709','54520','05658'],                                         travel: 4  },
    { estId: 'POZUELO',           stopIds: ['78710','05673'],                                                 travel: 5  },
    { estId: 'EL_BARRIAL',        stopIds: ['78804','10100','05672','78708'],                                 travel: 4  },
    { estId: 'RAMÓN_Y_CAJAL',     stopIds: ['78703','65204'],                                                 travel: 12 },
    { estId: 'CANTOBLANCO_U',     stopIds: ['78700','65202','65200'],                                        travel: 3  },
    { estId: 'TRES_CANTOS',       stopIds: ['65003','10101','10002','10103'],                                 travel: 5  },
    { estId: 'EL_BOALO',          stopIds: ['10104'],                                                         travel: 12 },
    { estId: 'MANZANARES',        stopIds: ['78605','10202'],                                                 travel: 8  },
    { estId: 'SOTO_REAL',         stopIds: ['77105','77104'],                                                 travel: 8  },
    { estId: 'CHOZAS_CANALES',    stopIds: ['77112','77114'],                                                 travel: 6  },
    { estId: 'MIRAFLORES',        stopIds: ['77109','77110'],                                                 travel: 8  },
    { estId: 'COLMENAR_VIEJO',    stopIds: ['65002','76003'],                                                 travel: 15 },
    { estId: 'VILLALBA',          stopIds: ['79100','05621'],                                                 travel: 20 },
  ]),
};

// ── Índice inverso: stopId → { lineId, posición en ruta } ─────
const STOP_TO_ROUTE = {};

for (const [lineId, stops] of Object.entries(ROUTES)) {
  stops.forEach((stop, idx) => {
    for (const stopId of stop.stopIds) {
      if (!STOP_TO_ROUTE[stopId]) STOP_TO_ROUTE[stopId] = [];
      STOP_TO_ROUTE[stopId].push({ lineId, idx });
    }
  });
}

const ENDPOINTS = {
  C1:  { A: 'Príncipe Pío',        B: 'Aeropuerto T1-T2-T3' },
  C2:  { A: 'Guadalajara',          B: 'Atocha' },
  C3:  { A: 'El Escorial',          B: 'Aranjuez' },
  C4a: { A: 'Parla',                B: 'Alcobendas-SS de los Reyes' },
  C4b: { A: 'Parla',                B: 'Colmenar Viejo' },
  C5:  { A: 'Móstoles El Soto',     B: 'Humanes' },
  C7:  { A: 'Alcalá de Henares',    B: 'Navalcarnero' },
  C8a: { A: 'El Escorial',          B: 'Atocha' },
  C8b: { A: 'Cercedilla',           B: 'Atocha' },
  C9:  { A: 'Cercedilla',           B: 'Cotos / Navacerrada' },
  C10: { A: 'Chamartín',            B: 'Villalba / Miraflores' },
};

module.exports = { ROUTES, STOP_TO_ROUTE, ENDPOINTS };
