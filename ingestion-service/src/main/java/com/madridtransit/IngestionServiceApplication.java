package com.madridtransit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada principal del microservicio de ingesta.
 *
 * <p>Responsabilidades:
 * <ul>
 *   <li>Conectarse a las APIs de EMT Madrid y Renfe</li>
 *   <li>Transformar los datos al modelo interno {@code TransitVehicleEvent}</li>
 *   <li>Publicar los eventos crudos en el topic Kafka {@code madrid-transit-raw}</li>
 * </ul>
 *
 * @author Madrid Transit Pulse Team
 * @version 1.0.0
 */
@SpringBootApplication
@EnableScheduling  // Habilita el procesamiento de tareas @Scheduled
public class IngestionServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IngestionServiceApplication.class, args);
    }
}
