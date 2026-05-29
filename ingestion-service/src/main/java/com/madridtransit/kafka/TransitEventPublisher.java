package com.madridtransit.kafka;

import com.madridtransit.model.TransitVehicleEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Servicio de bajo nivel para la publicación de mensajes en Kafka.
 *
 * <p>Encapsula la lógica de envío, callbacks de confirmación y métricas
 * de publicación. {@link com.madridtransit.service.TransportIngestionService}
 * delega en esta clase para enviar mensajes al bus.
 *
 * <p>Mantiene contadores atómicos de mensajes enviados/fallidos para
 * exposición vía Actuator ({@code /actuator/metrics}).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransitEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${madrid-transit.kafka.topic-raw}")
    private String topicRaw;

    /** Contador de mensajes enviados exitosamente (thread-safe) */
    private final AtomicLong mensajesEnviados = new AtomicLong(0);

    /** Contador de mensajes con error de envío (thread-safe) */
    private final AtomicLong mensajesFallidos = new AtomicLong(0);

    /**
     * Publica un único evento de vehículo en el topic {@code madrid-transit-raw}.
     *
     * <p>El mensaje se envía de forma asíncrona. El callback {@code whenComplete}
     * gestiona el resultado sin bloquear el hilo del scheduler.
     *
     * @param evento Evento de vehículo a publicar
     * @return CompletableFuture con el resultado del envío
     */
    public CompletableFuture<SendResult<String, Object>> publicar(TransitVehicleEvent evento) {
        // Clave = vehicleId → misma partición para el mismo vehículo (orden garantizado)
        CompletableFuture<SendResult<String, Object>> future =
            kafkaTemplate.send(topicRaw, evento.getVehicleId(), evento);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                mensajesEnviados.incrementAndGet();
                log.debug("📨 [Kafka] Enviado vehicleId={} → partition={}, offset={}",
                         evento.getVehicleId(),
                         result.getRecordMetadata().partition(),
                         result.getRecordMetadata().offset());
            } else {
                mensajesFallidos.incrementAndGet();
                log.error("❌ [Kafka] Error enviando vehicleId={}: {}",
                         evento.getVehicleId(), ex.getMessage());
            }
        });

        return future;
    }

    /**
     * Publica un lote de eventos de forma asíncrona.
     *
     * @param eventos Lista de eventos a publicar
     * @return Número de mensajes que se intentaron enviar
     */
    public int publicarLote(List<TransitVehicleEvent> eventos) {
        eventos.forEach(this::publicar);
        log.info("📦 [Kafka] Lote de {} mensajes enviados al topic '{}'",
                eventos.size(), topicRaw);
        return eventos.size();
    }

    /**
     * Retorna el número total de mensajes enviados desde el arranque.
     * Disponible vía {@code /actuator/metrics/kafka.mensajes.enviados}.
     */
    public long getMensajesEnviados() {
        return mensajesEnviados.get();
    }

    /**
     * Retorna el número total de mensajes fallidos desde el arranque.
     */
    public long getMensajesFallidos() {
        return mensajesFallidos.get();
    }
}
