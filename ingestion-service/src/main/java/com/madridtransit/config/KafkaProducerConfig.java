package com.madridtransit.config;

import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuración de Kafka Producer para el microservicio de ingesta.
 *
 * <p>Define:
 * <ul>
 *   <li>El {@link ProducerFactory} con la configuración de serialización JSON</li>
 *   <li>El {@link KafkaTemplate} para publicar mensajes de forma tipada</li>
 *   <li>Los topics necesarios (se crean automáticamente si no existen)</li>
 * </ul>
 *
 * <p>Los topics se crean con 3 particiones para permitir paralelismo en Spark
 * y con factor de replicación 1 (ajustar a 3 en producción).
 */
@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${madrid-transit.kafka.topic-raw}")
    private String topicRaw;

    @Value("${madrid-transit.kafka.topic-processed}")
    private String topicProcessed;

    /**
     * Configuración base del producer.
     * Usa {@link JsonSerializer} para serializar {@code TransitVehicleEvent}
     * directamente como JSON en el value del mensaje Kafka.
     */
    @Bean
    public Map<String, Object> producerConfigs() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);

        // Garantías de entrega: todos los replicas deben confirmar
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        // Idempotencia: previene duplicados en caso de reintento
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Reintentos con backoff exponencial
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 1000);

        // Optimización de throughput: agrupar mensajes en batches
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);

        // Compresión Snappy: buen balance CPU/tamaño
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");

        // No añadir headers de tipo en el JSON (compatibilidad con Spark)
        props.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);

        return props;
    }

    /**
     * Factory de producers tipada con el modelo de evento de transporte.
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        return new DefaultKafkaProducerFactory<>(producerConfigs());
    }

    /**
     * Template de Kafka para publicar mensajes desde los servicios.
     * La clave del mensaje es el {@code vehicleId} para garantizar
     * que los eventos del mismo vehículo vayan a la misma partición (ordenación).
     */
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    // ----------------------------------------------------------
    // KafkaAdmin: Crea los topics automáticamente al arrancar
    // ----------------------------------------------------------

    /**
     * Admin client para la gestión programática de topics.
     */
    @Bean
    public KafkaAdmin kafkaAdmin() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        return new KafkaAdmin(configs);
    }

    /**
     * Topic principal: mensajes crudos de EMT y Renfe.
     * 3 particiones → permite 3 tareas Spark en paralelo.
     */
    @Bean
    public NewTopic topicMadridTransitRaw() {
        return TopicBuilder.name(topicRaw)
                .partitions(3)
                .replicas(1)  // Cambiar a 3 en producción
                .config("retention.ms", "86400000")  // Retención: 24 horas
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Topic secundario: mensajes ya procesados por Spark (alertas).
     */
    @Bean
    public NewTopic topicMadridTransitProcessed() {
        return TopicBuilder.name(topicProcessed)
                .partitions(3)
                .replicas(1)
                .config("retention.ms", "43200000")  // Retención: 12 horas
                .build();
    }
}
