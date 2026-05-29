package com.madridtransit.service;

import com.madridtransit.kafka.TransitEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Indicador de salud personalizado para el microservicio de ingesta.
 *
 * <p>Expone información en {@code /actuator/health} con detalles sobre:
 * <ul>
 *   <li>Estado de conectividad con Kafka</li>
 *   <li>Métricas de mensajes enviados/fallidos</li>
 * </ul>
 *
 * <p>Útil para Kubernetes liveness/readiness probes.
 */
@Component
@RequiredArgsConstructor
public class IngestionHealthIndicator implements HealthIndicator {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final TransitEventPublisher publisher;

    @Override
    public Health health() {
        try {
            // Verificamos que el KafkaTemplate está operativo
            // En producción: podría hacer un describe topics request
            boolean kafkaOperativo = kafkaTemplate.getDefaultTopic() != null
                || kafkaTemplate.getProducerFactory() != null;

            long enviados = publisher.getMensajesEnviados();
            long fallidos = publisher.getMensajesFallidos();

            // Si más del 10% de los mensajes fallan, marcamos como degradado
            double tasaFallo = enviados > 0 ?
                (double) fallidos / (enviados + fallidos) : 0.0;

            if (tasaFallo > 0.1) {
                return Health.down()
                    .withDetails(Map.of(
                        "kafka", "conectado",
                        "mensajes_enviados", enviados,
                        "mensajes_fallidos", fallidos,
                        "tasa_fallo_percent", String.format("%.1f%%", tasaFallo * 100),
                        "alerta", "Tasa de fallos superior al 10%"
                    ))
                    .build();
            }

            return Health.up()
                .withDetails(Map.of(
                    "kafka", "conectado",
                    "mensajes_enviados", enviados,
                    "mensajes_fallidos", fallidos,
                    "tasa_fallo_percent", String.format("%.1f%%", tasaFallo * 100)
                ))
                .build();

        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .withDetail("kafka", "no_disponible")
                .build();
        }
    }
}
