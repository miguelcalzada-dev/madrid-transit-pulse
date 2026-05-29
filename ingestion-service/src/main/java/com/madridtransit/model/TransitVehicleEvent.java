package com.madridtransit.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Modelo canónico de un evento de vehículo de transporte público.
 *
 * <p>Este DTO es el contrato de datos que fluye a través del pipeline:
 * EMT/Renfe API → TransportIngestionService → Kafka topic (madrid-transit-raw)
 * → Spark Structured Streaming
 *
 * <p>El campo {@code source} diferencia si el evento proviene de EMT (autobuses)
 * o de Renfe (trenes de cercanías).
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)  // Omite campos null en la serialización
public class TransitVehicleEvent {

    // ----------------------------------------------------------
    // Identificadores únicos del vehículo y su línea
    // ----------------------------------------------------------

    /** Identificador único del vehículo (matrícula o código interno) */
    private String vehicleId;

    /** Línea de transporte (ej: "27", "C1", "Metro_L6") */
    private String lineId;

    /** Nombre legible de la línea para mostrar en UI */
    private String lineName;

    // ----------------------------------------------------------
    // Fuente del evento
    // ----------------------------------------------------------

    /**
     * Origen del dato: "EMT" para autobuses, "RENFE" para cercanías.
     * Usado en Spark para aplicar esquemas de procesamiento distintos.
     */
    private DataSource source;

    // ----------------------------------------------------------
    // Posición geográfica
    // ----------------------------------------------------------

    /** Latitud WGS84 del vehículo en el momento del muestreo */
    private Double latitude;

    /** Longitud WGS84 del vehículo en el momento del muestreo */
    private Double longitude;

    /** Velocidad en km/h (puede ser null si no la proporciona la API) */
    private Double speedKmh;

    /** Rumbo en grados (0-360, null si no disponible) */
    private Integer bearing;

    // ----------------------------------------------------------
    // Estado operacional
    // ----------------------------------------------------------

    /** Estado del vehículo según la API de origen */
    private VehicleStatus status;

    /** Ocupación aproximada: 0 (vacío) a 100 (lleno) */
    private Integer occupancyPercent;

    /** Retraso en segundos respecto al horario planificado (positivo = retraso) */
    private Integer delaySeconds;

    // ----------------------------------------------------------
    // Metadatos temporales
    // ----------------------------------------------------------

    /** Timestamp exacto del momento en que el vehículo reportó su posición */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private Instant vehicleTimestamp;

    /** Timestamp de cuando el microservicio recibió y procesó este evento */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private Instant ingestedAt;

    // ----------------------------------------------------------
    // Enums de estado
    // ----------------------------------------------------------

    /** Fuentes de datos disponibles en el sistema */
    public enum DataSource {
        METRO,  // Metro de Madrid
        RENFE   // Red Nacional de Ferrocarriles Españoles (cercanías)
    }

    /** Estados posibles de un vehículo en servicio */
    public enum VehicleStatus {
        EN_RUTA,           // Circulando con normalidad
        EN_PARADA,         // Detenido en una parada oficial
        FUERA_DE_SERVICIO, // No está en servicio activo
        DESCONOCIDO        // Estado no determinado por la API
    }
}
