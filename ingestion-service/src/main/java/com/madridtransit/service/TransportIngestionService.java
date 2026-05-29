package com.madridtransit.service;

import com.madridtransit.model.TransitVehicleEvent;
import com.madridtransit.model.TransitVehicleEvent.DataSource;
import com.madridtransit.model.TransitVehicleEvent.VehicleStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Servicio principal de ingesta de datos de transporte público de Madrid.
 *
 * <p>En producción, este servicio realizaría peticiones HTTP a:
 * <ul>
 *   <li><b>EMT Madrid</b>: {@code https://openapi.emtmadrid.es/v2/mobilitylabs/user/login/}
 *       para obtener token, y luego {@code /transport/busemtmad/stops/arrivals/} para
 *       posiciones de autobuses en tiempo real.</li>
 *   <li><b>Renfe Cercanías</b>: Feed GTFS-RT en formato Protobuf para posiciones
 *       de trenes de cercanías en el área de Madrid.</li>
 * </ul>
 *
 * <p>Para el entorno de desarrollo, simula datos realistas con distribución
 * geográfica sobre el mapa de Madrid.
 *
 * <p>Flujo de datos:
 * <pre>
 *   @Scheduled → generarEventosEMT() → transformar → publicar en Kafka (madrid-transit-raw)
 *   @Scheduled → generarEventosRenfe() → transformar → publicar en Kafka (madrid-transit-raw)
 * </pre>
 *
 * @see TransitVehicleEvent
 * @see com.madridtransit.config.KafkaProducerConfig
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransportIngestionService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${madrid-transit.kafka.topic-raw}")
    private String topicRaw;

    /** Generador de números aleatorios para simular variaciones de posición */
    private final Random random = new Random();

    // ----------------------------------------------------------
    // Datos de referencia: líneas reales de Madrid
    // ----------------------------------------------------------

    /**
     * Líneas de autobús EMT de Madrid más utilizadas.
     * Formato: {id, nombre, latBase, lonBase}
     * Las coordenadas base son puntos de la ruta aproximada de cada línea.
     */
    private static final double[][] EMT_LINES = {
        // lineIndex, nombreLinea (como índice), latBase, lonBase
        // Línea 27: Embajadores - Glorieta de Cuatro Caminos
        // Línea 1: Almudena - Plaza de Castilla
        // etc.
    };

    /** Líneas reales de autobús EMT con sus coordenadas base */
    private static final List<LineConfig> EMT_LINE_CONFIGS = List.of(
        new LineConfig("EMT-27", "27", "Embajadores - Cuatro Caminos", 40.4070, -3.7050),
        new LineConfig("EMT-1",  "1",  "Almudena - Plaza Castilla",    40.4500, -3.7000),
        new LineConfig("EMT-44", "44", "Legazpi - Moncloa",            40.3900, -3.7150),
        new LineConfig("EMT-14", "14", "Atocha - Pitis",               40.4070, -3.6900),
        new LineConfig("EMT-3",  "3",  "Puerta Toledo - Barrio Pilar", 40.4130, -3.7140),
        new LineConfig("EMT-23", "23", "Campamento - Valdecilla",      40.3990, -3.7500),
        new LineConfig("EMT-61", "61", "Entrevías - Vicálvaro",        40.3850, -3.6500),
        new LineConfig("EMT-53", "53", "Guzmán el Bueno - Sol",        40.4300, -3.7080),
        new LineConfig("EMT-75", "75", "Barajas - Canillejas",         40.4700, -3.5900),
        new LineConfig("EMT-49", "49", "Embajadores - Hortaleza",      40.4100, -3.6950)
    );

    /** Líneas de Renfe Cercanías que pasan por Madrid */
    private static final List<LineConfig> RENFE_LINE_CONFIGS = List.of(
        new LineConfig("RENFE-C1", "C1", "Aeropuerto - Príncipe Pío",  40.4143, -3.7194),
        new LineConfig("RENFE-C2", "C2", "Guadalajara - Chamartín",     40.4720, -3.6795),
        new LineConfig("RENFE-C3", "C3", "El Escorial - Aranjuez",      40.3970, -3.6844),
        new LineConfig("RENFE-C4", "C4", "Alcobendas - Parla",          40.4058, -3.6920),
        new LineConfig("RENFE-C5", "C5", "Móstoles - Humanes",          40.3220, -3.8650),
        new LineConfig("RENFE-C7", "C7", "Alcalá - Móstoles",           40.3350, -3.7000),
        new LineConfig("RENFE-C8", "C8", "Atocha - Villalba",           40.4068, -3.6903),
        new LineConfig("RENFE-C9", "C9", "Cercedilla - Cotos",          40.8700, -4.0500),
        new LineConfig("RENFE-C10","C10","Villalba - Chamartín",        40.4650, -3.6780)
    );

    // ----------------------------------------------------------
    // Tareas programadas de ingesta
    // ----------------------------------------------------------

    /**
     * Ingesta de datos de la EMT de Madrid.
     *
     * <p>En producción: llama a la API REST de EMT con autenticación OAuth2.
     * En desarrollo: genera eventos simulados con posiciones realistas.
     *
     * <p>Ejecuta cada 30 segundos por defecto (configurable en application.yml).
     */
    @Scheduled(fixedDelayString = "${madrid-transit.scheduler.emt-interval-ms:30000}",
               initialDelay = 2000)  // Espera 2s al arrancar para que Kafka esté listo
    public void ingestarDatosEMT() {
        log.info("🚌 [EMT] Iniciando ciclo de ingesta. Timestamp: {}", Instant.now());

        try {
            // En producción: reemplazar por llamada HTTP real a la API EMT
            List<TransitVehicleEvent> eventos = simularRespuestaApiEMT();

            // Publicamos cada evento en Kafka de forma asíncrona
            int exitosos = 0;
            for (TransitVehicleEvent evento : eventos) {
                try {
                    publicarEnKafka(evento);
                    exitosos++;
                } catch (Exception e) {
                    log.error("❌ [EMT] Error publicando vehículo {}: {}",
                             evento.getVehicleId(), e.getMessage());
                }
            }

            log.info("✅ [EMT] Ciclo completado. Publicados {}/{} eventos en topic '{}'",
                    exitosos, eventos.size(), topicRaw);

        } catch (Exception e) {
            log.error("❌ [EMT] Error crítico en ciclo de ingesta: {}", e.getMessage(), e);
        }
    }

    /**
     * Ingesta de datos de Renfe Cercanías.
     *
     * <p>En producción: consume el feed GTFS-RT de Renfe en formato Protobuf
     * y lo transforma al modelo {@link TransitVehicleEvent}.
     *
     * <p>Ejecuta cada 60 segundos (los trenes actualizan menos frecuentemente).
     */
    @Scheduled(fixedDelayString = "${madrid-transit.scheduler.renfe-interval-ms:60000}",
               initialDelay = 5000)  // Offset respecto a EMT para no saturar Kafka
    public void ingestarDatosRenfe() {
        log.info("🚆 [RENFE] Iniciando ciclo de ingesta. Timestamp: {}", Instant.now());

        try {
            // En producción: parsear feed GTFS-RT Protobuf de Renfe
            List<TransitVehicleEvent> eventos = simularRespuestaApiRenfe();

            int exitosos = 0;
            for (TransitVehicleEvent evento : eventos) {
                try {
                    publicarEnKafka(evento);
                    exitosos++;
                } catch (Exception e) {
                    log.error("❌ [RENFE] Error publicando tren {}: {}",
                             evento.getVehicleId(), e.getMessage());
                }
            }

            log.info("✅ [RENFE] Ciclo completado. Publicados {}/{} eventos en topic '{}'",
                    exitosos, eventos.size(), topicRaw);

        } catch (Exception e) {
            log.error("❌ [RENFE] Error crítico en ciclo de ingesta: {}", e.getMessage(), e);
        }
    }

    // ----------------------------------------------------------
    // Publicación en Kafka
    // ----------------------------------------------------------

    /**
     * Publica un evento de vehículo en el topic de Kafka.
     *
     * <p>La clave del mensaje es el {@code vehicleId}, garantizando que todos
     * los eventos del mismo vehículo vayan a la misma partición (necesario
     * para que Spark pueda detectar el estado previo del vehículo).
     *
     * @param evento El evento de vehículo a publicar
     */
    private void publicarEnKafka(TransitVehicleEvent evento) {
        // Clave = vehicleId para preservar orden por vehículo en la misma partición
        CompletableFuture<SendResult<String, Object>> future =
            kafkaTemplate.send(topicRaw, evento.getVehicleId(), evento);

        // Callback asíncrono para logging de confirmación/error
        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.debug("📨 Mensaje enviado: vehicleId={}, partition={}, offset={}",
                         evento.getVehicleId(),
                         result.getRecordMetadata().partition(),
                         result.getRecordMetadata().offset());
            } else {
                log.error("❌ Error enviando mensaje para vehicleId={}: {}",
                         evento.getVehicleId(), ex.getMessage());
            }
        });
    }

    // ----------------------------------------------------------
    // Simuladores de APIs externas (para entorno de desarrollo)
    // ----------------------------------------------------------

    /**
     * Simula la respuesta de la API REST de EMT Madrid.
     *
     * <p>Genera entre 3 y 6 vehículos activos por cada línea EMT configurada.
     * Las posiciones varían ligeramente en cada ciclo para simular movimiento.
     *
     * <p><b>TODO (Producción)</b>: Reemplazar por llamada real a:
     * <pre>
     * POST https://openapi.emtmadrid.es/v2/mobilitylabs/user/login/ → obtener token
     * GET  https://openapi.emtmadrid.es/v2/transport/busemtmad/stops/{stopId}/arrives/{lineId}/
     * </pre>
     *
     * @return Lista de eventos de vehículos EMT simulados
     */
    private List<TransitVehicleEvent> simularRespuestaApiEMT() {
        List<TransitVehicleEvent> eventos = new ArrayList<>();

        for (LineConfig linea : EMT_LINE_CONFIGS) {
            // Entre 3 y 6 autobuses por línea en circulación
            int numVehiculos = 3 + random.nextInt(4);

            for (int i = 0; i < numVehiculos; i++) {
                // Variación aleatoria alrededor del punto base de la línea
                // Radio ~500m (≈ 0.0045 grados latitud, 0.006 grados longitud en Madrid)
                double latVariacion = (random.nextDouble() - 0.5) * 0.015;
                double lonVariacion = (random.nextDouble() - 0.5) * 0.020;

                // Simulamos que algunos vehículos tienen retraso
                int retrasoSegundos = random.nextInt(10) < 2 ? // 20% probabilidad de retraso
                    random.nextInt(300) + 60 : // Retraso entre 1 y 6 minutos
                    random.nextInt(60) - 30;   // Normal: -30 a +30 segundos

                // Simulamos que algunos están parados (candidatos a anomalía en Spark)
                boolean estaParado = random.nextInt(10) < 1; // 10% parados

                TransitVehicleEvent evento = TransitVehicleEvent.builder()
                    .vehicleId(String.format("%s-BUS-%03d", linea.id(), i + 1))
                    .lineId(linea.lineNumber())
                    .lineName(linea.name())
                    .source(DataSource.EMT)
                    .latitude(linea.latBase() + latVariacion)
                    .longitude(linea.lonBase() + lonVariacion)
                    .speedKmh(estaParado ? 0.0 : 15.0 + random.nextDouble() * 35.0)
                    .bearing(random.nextInt(360))
                    .status(estaParado ? VehicleStatus.EN_PARADA : VehicleStatus.EN_RUTA)
                    .occupancyPercent(random.nextInt(101))
                    .delaySeconds(retrasoSegundos)
                    .vehicleTimestamp(Instant.now())
                    .ingestedAt(Instant.now())
                    .build();

                eventos.add(evento);
            }
        }

        log.debug("🚌 [EMT-SIM] Generados {} eventos de {} líneas",
                 eventos.size(), EMT_LINE_CONFIGS.size());
        return eventos;
    }

    /**
     * Simula la respuesta del feed GTFS-RT de Renfe Cercanías.
     *
     * <p>Genera entre 1 y 3 trenes activos por línea de cercanías.
     *
     * <p><b>TODO (Producción)</b>: Descargar y parsear feed Protobuf desde:
     * <pre>
     * GET https://gtfs.rhaebus.com/api/v3/realtime_feed?agencyId=RENFE
     * </pre>
     * Usando la librería {@code google.transit:gtfs-realtime-bindings}.
     *
     * @return Lista de eventos de vehículos Renfe simulados
     */
    private List<TransitVehicleEvent> simularRespuestaApiRenfe() {
        List<TransitVehicleEvent> eventos = new ArrayList<>();

        for (LineConfig linea : RENFE_LINE_CONFIGS) {
            // Entre 1 y 3 trenes por línea (los trenes van más espaciados)
            int numVehiculos = 1 + random.nextInt(3);

            for (int i = 0; i < numVehiculos; i++) {
                double latVariacion = (random.nextDouble() - 0.5) * 0.030;
                double lonVariacion = (random.nextDouble() - 0.5) * 0.050;

                // Los trenes tienen retrasos más significativos y frecuentes
                int retrasoSegundos = random.nextInt(10) < 3 ? // 30% probabilidad de retraso
                    random.nextInt(600) + 60 :  // Retraso hasta 10 minutos
                    random.nextInt(120) - 60;   // Normal: ±1 minuto

                TransitVehicleEvent evento = TransitVehicleEvent.builder()
                    .vehicleId(String.format("%s-TREN-%03d", linea.id(), i + 1))
                    .lineId(linea.lineNumber())
                    .lineName(linea.name())
                    .source(DataSource.RENFE)
                    .latitude(linea.latBase() + latVariacion)
                    .longitude(linea.lonBase() + lonVariacion)
                    .speedKmh(80.0 + random.nextDouble() * 60.0) // Trenes más rápidos
                    .bearing(random.nextInt(360))
                    .status(random.nextInt(5) == 0 ? // 20% en parada
                           VehicleStatus.EN_PARADA : VehicleStatus.EN_RUTA)
                    .occupancyPercent(random.nextInt(101))
                    .delaySeconds(retrasoSegundos)
                    .vehicleTimestamp(Instant.now())
                    .ingestedAt(Instant.now())
                    .build();

                eventos.add(evento);
            }
        }

        log.debug("🚆 [RENFE-SIM] Generados {} eventos de {} líneas",
                 eventos.size(), RENFE_LINE_CONFIGS.size());
        return eventos;
    }

    // ----------------------------------------------------------
    // Clases de apoyo internas
    // ----------------------------------------------------------

    /**
     * Configuración de una línea de transporte para la simulación.
     *
     * @param id         Identificador único compuesto (ej: "EMT-27")
     * @param lineNumber Número/código de línea para mostrar (ej: "27", "C1")
     * @param name       Nombre descriptivo de la línea
     * @param latBase    Latitud del punto central de la ruta
     * @param lonBase    Longitud del punto central de la ruta
     */
    private record LineConfig(
        String id,
        String lineNumber,
        String name,
        double latBase,
        double lonBase
    ) {}
}
