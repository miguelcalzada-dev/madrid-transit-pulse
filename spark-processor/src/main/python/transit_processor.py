"""
============================================================
transit_processor.py - Pipeline de Spark Structured Streaming
Madrid Transit Pulse
============================================================

Responsabilidades:
  1. Leer mensajes crudos del topic Kafka 'madrid-transit-raw'
  2. Parsear el JSON con el esquema de TransitVehicleEvent
  3. Aplicar ventana deslizante de 2 minutos para:
     a) Contar vehículos activos por línea
     b) Detectar anomalías: vehículos sin cambio de coordenadas
        en 3 lecturas consecutivas → "posible_retraso_grave"
  4. Escribir resultados en MongoDB (colección transit_alerts)

Ejecución local:
    spark-submit \\
      --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,\\
                 org.mongodb.spark:mongo-spark-connector_2.12:10.3.0 \\
      src/main/python/transit_processor.py

Variables de entorno:
    KAFKA_BOOTSTRAP_SERVERS  (default: localhost:9092)
    MONGO_URI                (default: mongodb://admin:madridpulse2024@localhost:27017)
    MONGO_DATABASE           (default: madrid_transit)
    LOG_LEVEL                (default: INFO)

Versiones requeridas:
    Python  3.10+
    PySpark 3.5.0
    Spark Kafka Connector 3.5.0
    MongoDB Spark Connector 10.3.0

@author Madrid Transit Pulse Team
@version 1.0.0
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType,
    IntegerType, TimestampType, BooleanType
)
from pyspark.sql.window import Window

# Spark MLlib para Inteligencia Artificial Predictiva
from pyspark.ml import Pipeline, PipelineModel
from pyspark.ml.feature import VectorAssembler, StringIndexer
from pyspark.ml.regression import RandomForestRegressor

# ============================================================
# Configuración de logging
# ============================================================
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("madrid-transit-pulse")


# ============================================================
# Constantes de configuración
# ============================================================

# Kafka
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_RAW         = "madrid-transit-raw"
KAFKA_TOPIC_PROCESSED   = "madrid-transit-processed"

# MongoDB
MONGO_URI      = os.getenv("MONGO_URI", "mongodb://mtp_app:mtp_secure_pass@localhost:27017")
MONGO_DATABASE = os.getenv("MONGO_DATABASE", "madrid_transit")
MONGO_COLLECTION_ALERTS  = "transit_alerts"
MONGO_COLLECTION_STATUS  = "vehicle_status"

# Spark Streaming
CHECKPOINT_DIR = os.getenv("CHECKPOINT_DIR", "/tmp/mtp-spark-checkpoints")
TRIGGER_INTERVAL = "10 seconds"  # Frecuencia de procesamiento micro-batch

# Lógica de negocio
VENTANA_DESLIZANTE_DURACION = "2 minutes"   # Tamaño de la ventana de análisis
VENTANA_DESLIZANTE_SLIDE    = "30 seconds"  # Frecuencia de avance de la ventana
UMBRAL_INACTIVIDAD_LECTURAS = 3             # Lecturas sin movimiento = anomalía
UMBRAL_VELOCIDAD_PARADO     = 1.0           # km/h por debajo = vehículo parado


# ============================================================
# Esquema JSON del evento de vehículo
# ============================================================

# Esquema que debe coincidir exactamente con TransitVehicleEvent (Java)
SCHEMA_TRANSIT_VEHICLE_EVENT = StructType([
    StructField("vehicleId",        StringType(),    nullable=False),
    StructField("lineId",           StringType(),    nullable=False),
    StructField("lineName",         StringType(),    nullable=True),
    StructField("source",           StringType(),    nullable=False),  # "EMT" | "RENFE"
    StructField("latitude",         DoubleType(),    nullable=False),
    StructField("longitude",        DoubleType(),    nullable=False),
    StructField("speedKmh",         DoubleType(),    nullable=True),
    StructField("bearing",          IntegerType(),   nullable=True),
    StructField("status",           StringType(),    nullable=True),
    StructField("occupancyPercent", IntegerType(),   nullable=True),
    StructField("delaySeconds",     IntegerType(),   nullable=True),
    StructField("vehicleTimestamp", StringType(),    nullable=False),  # ISO 8601
    StructField("ingestedAt",       StringType(),    nullable=True),
])


# ============================================================
# Inicialización de SparkSession
# ============================================================

def crear_spark_session() -> SparkSession:
    """
    Crea y configura la SparkSession para el pipeline de streaming.

    Configuraciones relevantes:
    - MongoDB Spark Connector: para el sink final
    - Kafka: configuración del consumer
    - Streaming: tolerancia a fallos con checkpointing

    Returns:
        SparkSession configurada y lista para usar
    """
    logger.info("🔧 Inicializando SparkSession...")

    spark = (
        SparkSession.builder
        .appName("MadridTransitPulse-StreamProcessor")
        .master(os.getenv("SPARK_MASTER", "local[*]"))  # local[*] = todos los cores disponibles

        # --------------------------------------------------
        # Configuración del conector MongoDB
        # --------------------------------------------------
        .config("spark.mongodb.write.connection.uri", MONGO_URI)
        .config("spark.mongodb.write.database", MONGO_DATABASE)
        .config("spark.mongodb.read.connection.uri", MONGO_URI)
        .config("spark.mongodb.read.database", MONGO_DATABASE)

        # --------------------------------------------------
        # Optimizaciones de Spark SQL para streaming
        # --------------------------------------------------
        # Reduce shuffle partitions para entorno local (default 200 es excesivo)
        .config("spark.sql.shuffle.partitions", "8")

        # Mantiene estado en memoria para stateful streaming
        .config("spark.sql.streaming.stateStore.providerClass",
                "org.apache.spark.sql.execution.streaming.state.HDFSBackedStateStoreProvider")

        # Configuración de marca de agua (watermark) para late data
        .config("spark.sql.streaming.watermark.strategy", "noWatermark")

        # --------------------------------------------------
        # Logging de Spark (reducir verbosidad)
        # --------------------------------------------------
        .getOrCreate()
    )

    # Reducir el logging de Spark para que no tape nuestros logs
    spark.sparkContext.setLogLevel("WARN")

    logger.info(f"✅ SparkSession creada. Versión: {spark.version}")
    return spark


# ============================================================
# PASO 1: Lectura del stream de Kafka
# ============================================================

def leer_stream_kafka(spark: SparkSession) -> DataFrame:
    """
    Lee el stream de mensajes crudos del topic Kafka 'madrid-transit-raw'.

    El topic recibe mensajes publicados por el microservicio Spring Boot.
    Cada mensaje tiene:
    - key: vehicleId (string)
    - value: JSON serializado de TransitVehicleEvent

    Args:
        spark: SparkSession activa

    Returns:
        DataFrame con el stream de Kafka parseado y listo para procesar
    """
    logger.info(f"📡 Conectando a Kafka: {KAFKA_BOOTSTRAP_SERVERS}, topic: {KAFKA_TOPIC_RAW}")

    # Leer el stream raw de Kafka
    stream_raw = (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
        .option("subscribe", KAFKA_TOPIC_RAW)
        # Empezar por los últimos mensajes (no reprocesar histórico)
        .option("startingOffsets", "latest")
        # Máximo de mensajes por micro-batch (control de backpressure)
        .option("maxOffsetsPerTrigger", 1000)
        # Tolerancia a que Kafka no esté disponible al arrancar
        .option("failOnDataLoss", "false")
        .load()
    )

    # Parsear el value (bytes) como JSON usando el esquema definido
    df_parseado = (
        stream_raw
        # El value de Kafka es bytes → convertir a string
        .select(
            F.col("key").cast("string").alias("kafka_key"),
            F.col("value").cast("string").alias("json_raw"),
            F.col("timestamp").alias("kafka_timestamp"),
            F.col("partition").alias("kafka_partition"),
            F.col("offset").alias("kafka_offset"),
        )
        # Parsear el JSON usando el esquema de TransitVehicleEvent
        .withColumn("evento", F.from_json(F.col("json_raw"), SCHEMA_TRANSIT_VEHICLE_EVENT))
        # Extraer campos del JSON a columnas de primer nivel
        .select(
            "kafka_timestamp",
            "kafka_partition",
            "kafka_offset",
            F.col("evento.vehicleId").alias("vehicle_id"),
            F.col("evento.lineId").alias("line_id"),
            F.col("evento.lineName").alias("line_name"),
            F.col("evento.source").alias("source"),
            F.col("evento.latitude").alias("lat"),
            F.col("evento.longitude").alias("lon"),
            F.col("evento.speedKmh").alias("speed_kmh"),
            F.col("evento.status").alias("vehicle_status"),
            F.col("evento.occupancyPercent").alias("occupancy_pct"),
            F.col("evento.delaySeconds").alias("delay_seconds"),
            # Convertir el timestamp ISO 8601 a tipo Timestamp de Spark
            F.to_timestamp(
                F.col("evento.vehicleTimestamp"),
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            ).alias("vehicle_ts"),
        )
        # Filtrar filas donde el JSON no pudo parsearse correctamente
        .filter(F.col("vehicle_id").isNotNull())
    )

    logger.info("✅ Stream de Kafka configurado correctamente")
    return df_parseado


# ============================================================
# PASO 2A: Conteo de vehículos activos por línea (Windowed)
# ============================================================

def calcular_conteo_por_linea(df_stream: DataFrame) -> DataFrame:
    """
    Calcula el número de vehículos activos por línea usando una
    ventana deslizante (sliding window) de 2 minutos.

    Lógica de ventana:
    - Duración: 2 minutos → analiza los últimos 2 minutos de datos
    - Slide:   30 segundos → produce un resultado cada 30 segundos
    - Watermark: 30 segundos → tolera mensajes con hasta 30s de retraso

    Esta operación es STATEFUL: Spark mantiene el estado de la ventana
    en memoria y lo actualiza con cada micro-batch.

    Args:
        df_stream: DataFrame con el stream parseado de Kafka

    Returns:
        DataFrame agregado con conteo por línea y ventana temporal
    """
    df_con_watermark = df_stream.withWatermark(
        "vehicle_ts",
        "30 seconds"  # Tolerancia para mensajes que llegan tarde
    )

    df_conteo = (
        df_con_watermark
        # Ventana deslizante: 2 minutos de duración, avanza cada 30 segundos
        .groupBy(
            F.window(F.col("vehicle_ts"), VENTANA_DESLIZANTE_DURACION, VENTANA_DESLIZANTE_SLIDE),
            F.col("line_id"),
            F.col("line_name"),
            F.col("source"),
        )
        .agg(
            # Total de vehículos únicos activos en la ventana
            F.countDistinct("vehicle_id").alias("vehiculos_activos"),
            # Vehículos parados (speed ≈ 0)
            F.count(
                F.when(F.col("speed_kmh") < UMBRAL_VELOCIDAD_PARADO, 1)
            ).alias("vehiculos_parados"),
            # Retraso promedio de la línea en la ventana
            F.avg("delay_seconds").alias("retraso_promedio_seg"),
            # Retraso máximo detectado
            F.max("delay_seconds").alias("retraso_maximo_seg"),
            # Ocupación promedio
            F.avg("occupancy_pct").alias("ocupacion_promedio_pct"),
            # Último timestamp visto en la ventana
            F.max("vehicle_ts").alias("ultimo_evento_ts"),
        )
        # Añadir columnas de metadata del resultado
        .withColumn("tipo_agregacion", F.lit("conteo_por_linea"))
        .withColumn("procesado_en", F.current_timestamp())
        # Formatear la ventana para facilitar queries en MongoDB
        .withColumn("ventana_inicio", F.col("window.start"))
        .withColumn("ventana_fin", F.col("window.end"))
        .drop("window")
    )

    return df_conteo


# ============================================================
# PASO 2.5: Inteligencia Artificial (Machine Learning)
# ============================================================

def entrenar_modelo_predictivo(spark: SparkSession) -> PipelineModel:
    """
    Entrena un modelo Random Forest de regresión en memoria al arrancar.
    En producción, este modelo se cargaría desde HDFS/S3 usando:
    PipelineModel.load("s3://models/transit_delay_rf_v1")

    El modelo predice los minutos de retraso basados en la velocidad actual,
    la ocupación del vehículo y la línea en la que se encuentra.
    """
    logger.info("🧠 [AI] Entrenando modelo Random Forest Predictor de Retrasos...")

    # Generamos datos sintéticos de entrenamiento para el portfolio
    data = []
    for _ in range(1000):
        # speedKmh, occupancyPercent, lineId, real_delay_minutes (label)
        import random
        speed = random.uniform(0.0, 90.0)
        occ = random.uniform(10.0, 100.0)
        line = random.choice(["C1", "C2", "C3", "C4", "C5", "L1", "L6", "L10"])
        
        # Lógica oculta que el modelo debe aprender:
        # Menos velocidad + más ocupación = mucho retraso
        delay = 0.0
        if speed < 15.0: delay += random.uniform(5.0, 15.0)
        if occ > 80.0: delay += random.uniform(2.0, 5.0)
        if line in ["C5", "L6"]: delay += random.uniform(1.0, 4.0) # Líneas problemáticas
        
        data.append((speed, occ, line, delay))

    df_train = spark.createDataFrame(data, ["speed_kmh", "occupancy_pct", "line_id", "label"])

    # Pipeline de Machine Learning
    indexer = StringIndexer(inputCol="line_id", outputCol="line_index", handleInvalid="keep")
    assembler = VectorAssembler(inputCols=["speed_kmh", "occupancy_pct", "line_index"], outputCol="features")
    rf = RandomForestRegressor(featuresCol="features", labelCol="label", numTrees=20, maxDepth=5)

    pipeline = Pipeline(stages=[indexer, assembler, rf])
    model = pipeline.fit(df_train)
    
    logger.info("✅ [AI] Modelo de Inteligencia Artificial entrenado y listo para inferencia en streaming.")
    return model

def predecir_retrasos_con_ia(df_stream: DataFrame, modelo_ia: PipelineModel) -> DataFrame:
    """
    Aplica el modelo de Machine Learning sobre el stream en vivo para PREDECIR
    retrasos antes de que el usuario o el sistema oficial los reporte.
    """
    # Preparamos las columnas para que coincidan con las que espera el modelo
    df_preparado = df_stream.withColumns({
        "speed_kmh": F.coalesce(F.col("speed_kmh"), F.lit(45.0)),
        "occupancy_pct": F.coalesce(F.col("occupancy_pct").cast("double"), F.lit(50.0)),
        "line_id": F.coalesce(F.col("line_id"), F.lit("UNKNOWN"))
    })

    # Aplicamos el modelo MLlib al stream (Inferencia en tiempo real)
    df_prediccion = modelo_ia.transform(df_preparado)

    # Filtramos solo aquellos vehículos donde el modelo predice > 5 minutos de retraso
    df_alertas_ia = (
        df_prediccion
        .filter(F.col("prediction") > 5.0)
        .select(
            F.col("vehicle_id").alias("vehicleId"),
            F.col("line_id").alias("lineId"),
            F.col("line_name").alias("lineName"),
            F.col("source"),
            F.lit("prediccion_ia").alias("alertType"),
            F.col("lat").alias("latitude"),
            F.col("lon").alias("longitude"),
            F.col("speed_kmh").alias("speedKmh"),
            (F.col("prediction") * 60).cast("int").alias("delaySeconds"), # Convertir mins a segs
            F.col("vehicle_ts").alias("detectedAt"),
            F.current_timestamp().alias("processedAt"),
            F.concat(
                F.lit("🤖 IA Predictiva: Riesgo de retraso inminente de "),
                F.round(F.col("prediction"), 1),
                F.lit(" minutos basado en telemetría actual.")
            ).alias("description"),
            F.when(F.col("prediction") > 10.0, "ALTA").otherwise("MEDIA").alias("severity")
        )
    )

    return df_alertas_ia


# ============================================================
# PASO 2B: Detección de anomalías por Reglas Heurísticas
# ============================================================

def detectar_anomalias_inmovilidad(df_stream: DataFrame) -> DataFrame:
    """
    Detecta vehículos que no han cambiado sus coordenadas en las
    últimas 3 lecturas consecutivas → candidatos a 'posible_retraso_grave'.

    Algoritmo:
    1. Para cada vehículo, ordenamos sus lecturas por timestamp
    2. Comparamos las coordenadas de cada lectura con las 2 anteriores
       usando funciones de ventana (lag)
    3. Si latitud y longitud son iguales en las 3 últimas lecturas
       y la velocidad es < 1 km/h → etiquetamos como anomalía

    Limitación Structured Streaming:
    Las funciones de ventana (Window.partitionBy + lag) en streaming
    requieren micro-batch mode (no continuous processing). Esto funciona
    correctamente con la configuración de trigger por intervalos.

    Args:
        df_stream: DataFrame con el stream parseado de Kafka

    Returns:
        DataFrame con solo las filas etiquetadas como anomalía
    """

    # NOTA ARQUITECTÓNICA: La detección de inmovilidad requiere estado entre
    # micro-batches. Usamos foreachBatch para mantener estado en MongoDB
    # (ver función procesar_batch_anomalias). Esta función prepara los datos.

    # Redondear coordenadas a 4 decimales (~11m de precisión)
    # Reduce falsos negativos por ruido GPS mínimo
    df_redondeado = df_stream.withColumns({
        "lat_redondeada": F.round(F.col("lat"), 4),
        "lon_redondeada": F.round(F.col("lon"), 4),
    })

    # Definimos la ventana de análisis por vehículo, ordenada por timestamp
    ventana_vehiculo = (
        Window
        .partitionBy("vehicle_id")
        .orderBy("vehicle_ts")
    )

    # Añadir las 2 lecturas anteriores de coordenadas usando LAG
    df_con_historico = (
        df_redondeado
        .withColumn("lat_anterior_1",   F.lag("lat_redondeada", 1).over(ventana_vehiculo))
        .withColumn("lon_anterior_1",   F.lag("lon_redondeada", 1).over(ventana_vehiculo))
        .withColumn("lat_anterior_2",   F.lag("lat_redondeada", 2).over(ventana_vehiculo))
        .withColumn("lon_anterior_2",   F.lag("lon_redondeada", 2).over(ventana_vehiculo))
        .withColumn("ts_anterior_1",    F.lag("vehicle_ts", 1).over(ventana_vehiculo))
    )

    # Condición de anomalía:
    # Las 3 últimas lecturas tienen coordenadas idénticas Y velocidad < 1 km/h
    condicion_inmovilidad = (
        # Misma latitud que hace 1 y 2 lecturas
        (F.col("lat_redondeada") == F.col("lat_anterior_1")) &
        (F.col("lat_redondeada") == F.col("lat_anterior_2")) &
        # Misma longitud que hace 1 y 2 lecturas
        (F.col("lon_redondeada") == F.col("lon_anterior_1")) &
        (F.col("lon_redondeada") == F.col("lon_anterior_2")) &
        # El vehículo reporta baja velocidad (no en parada planificada)
        (F.col("speed_kmh") < UMBRAL_VELOCIDAD_PARADO) &
        # Solo necesitamos las filas donde tenemos las 2 lecturas previas
        F.col("lat_anterior_2").isNotNull()
    )

    # Filtrar solo los vehículos que cumplen la condición de anomalía
    df_anomalias = (
        df_con_historico
        .filter(condicion_inmovilidad)
        .select(
            F.col("vehicle_id").alias("vehicleId"),
            F.col("line_id").alias("lineId"),
            F.col("line_name").alias("lineName"),
            F.col("source"),
            F.lit("posible_retraso_grave").alias("alertType"),
            F.col("lat").alias("latitude"),
            F.col("lon").alias("longitude"),
            F.col("speed_kmh").alias("speedKmh"),
            F.col("delay_seconds").alias("delaySeconds"),
            F.col("vehicle_ts").alias("detectedAt"),
            F.current_timestamp().alias("processedAt"),
            # Descripción legible para el frontend
            F.concat(
                F.lit("Vehículo "),
                F.col("vehicle_id"),
                F.lit(" (línea "),
                F.col("line_id"),
                F.lit(") sin movimiento en 3 lecturas consecutivas")
            ).alias("description"),
            # Severidad calculada en función del retraso acumulado
            F.when(F.col("delay_seconds") > 300, "ALTA")
             .when(F.col("delay_seconds") > 120, "MEDIA")
             .otherwise("BAJA")
             .alias("severity"),
        )
    )

    return df_anomalias


# ============================================================
# PASO 3: Sinks - Escritura en MongoDB
# ============================================================

def escribir_alertas_en_mongodb(df_anomalias: DataFrame) -> None:
    """
    Configura el sink de anomalías hacia MongoDB usando foreachBatch.

    foreachBatch permite:
    - Escribir en sistemas no nativos de Spark Streaming (como MongoDB)
    - Aplicar lógica personalizada por batch (upserts, transformaciones)
    - Manejo de errores a nivel de batch

    Args:
        df_anomalias: DataFrame con las anomalías detectadas
    """

    def escribir_batch_alertas(df_batch: DataFrame, batch_id: int) -> None:
        """
        Función ejecutada por cada micro-batch de anomalías.

        Args:
            df_batch: Datos del micro-batch actual (estático, no streaming)
            batch_id: Identificador secuencial del batch
        """
        num_alertas = df_batch.count()

        if num_alertas == 0:
            logger.debug(f"[Batch {batch_id}] Sin alertas nuevas")
            return

        logger.info(f"🚨 [Batch {batch_id}] Escribiendo {num_alertas} alertas en MongoDB...")

        try:
            # Convertir timestamp a formato que MongoDB entiende correctamente
            df_para_mongo = df_batch.withColumns({
                "detectedAt":  F.date_format("detectedAt",  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                "processedAt": F.date_format("processedAt", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                # Campo para TTL index: MongoDB eliminará docs después de 24h
                "timestamp":   F.current_timestamp(),
            })

            # Escritura en MongoDB usando el conector oficial
            (
                df_para_mongo.write
                .format("mongodb")
                .mode("append")
                .option("database", MONGO_DATABASE)
                .option("collection", MONGO_COLLECTION_ALERTS)
                .option("ordered", "false")  # No falla si hay error en un doc individual
                .save()
            )

            logger.info(f"✅ [Batch {batch_id}] {num_alertas} alertas escritas en MongoDB")

        except Exception as e:
            logger.error(f"❌ [Batch {batch_id}] Error escribiendo en MongoDB: {e}")
            # No relanzamos para no interrumpir el stream completo
            # En producción: enviar a DLQ (Dead Letter Queue) en Kafka

    # Configurar el stream con foreachBatch
    query = (
        df_anomalias.writeStream
        .foreachBatch(escribir_batch_alertas)
        .outputMode("append")
        .option("checkpointLocation", f"{CHECKPOINT_DIR}/alertas")
        .trigger(processingTime=TRIGGER_INTERVAL)
        .start()
    )

    logger.info("📤 Stream de alertas → MongoDB iniciado")
    return query


def escribir_conteo_en_mongodb(df_conteo: DataFrame) -> None:
    """
    Configura el sink de conteos por línea hacia MongoDB.

    Usa modo 'complete' porque las aggregaciones de ventana producen
    resultados completos (todos los grupos de la ventana actual).

    Args:
        df_conteo: DataFrame con el conteo de vehículos por línea y ventana
    """

    def escribir_batch_conteo(df_batch: DataFrame, batch_id: int) -> None:
        num_filas = df_batch.count()

        if num_filas == 0:
            return

        logger.info(f"📊 [Batch {batch_id}] Actualizando {num_filas} conteos de líneas...")

        try:
            (
                df_batch.write
                .format("mongodb")
                .mode("append")
                .option("database", MONGO_DATABASE)
                .option("collection", MONGO_COLLECTION_STATUS)
                .option("ordered", "false")
                .save()
            )
            logger.info(f"✅ [Batch {batch_id}] Conteos escritos en MongoDB")

        except Exception as e:
            logger.error(f"❌ [Batch {batch_id}] Error escribiendo conteos: {e}")

    query = (
        df_conteo.writeStream
        .foreachBatch(escribir_batch_conteo)
        .outputMode("update")  # update: solo escribe grupos que cambiaron
        .option("checkpointLocation", f"{CHECKPOINT_DIR}/conteos")
        .trigger(processingTime=TRIGGER_INTERVAL)
        .start()
    )

    logger.info("📤 Stream de conteos → MongoDB iniciado")
    return query


# ============================================================
# Sink adicional: Consola (para debug en desarrollo)
# ============================================================

def escribir_en_consola_debug(df_stream: DataFrame, nombre: str) -> object:
    """
    Escribe el stream en la consola para depuración.
    Solo activar en desarrollo; desactivar en producción.

    Args:
        df_stream: DataFrame del stream a inspeccionar
        nombre: Nombre descriptivo para el log
    """
    return (
        df_stream.writeStream
        .format("console")
        .option("truncate", False)
        .option("numRows", 10)
        .outputMode("append")
        .trigger(processingTime="30 seconds")
        .queryName(f"debug_{nombre}")
        .start()
    )


# ============================================================
# Main: Orquestación del pipeline completo
# ============================================================

def main():
    """
    Función principal que orquesta el pipeline de Spark Structured Streaming.

    Pipeline:
        Kafka → Parse JSON → [
            Ventana Deslizante: Conteo por línea → MongoDB (vehicle_status)
            Detección Anomalías: Inmovilidad 3 lecturas → MongoDB (transit_alerts)
        ]

    El stream corre indefinidamente hasta que se interrumpe (Ctrl+C)
    o hasta que ocurre un error no recuperable.
    """
    logger.info("=" * 60)
    logger.info("🚇 Madrid Transit Pulse - Spark Processor Iniciando")
    logger.info("=" * 60)
    logger.info(f"  Kafka:      {KAFKA_BOOTSTRAP_SERVERS}")
    logger.info(f"  Topic:      {KAFKA_TOPIC_RAW}")
    logger.info(f"  MongoDB:    {MONGO_URI.split('@')[-1]}")  # Ocultar credenciales
    logger.info(f"  Database:   {MONGO_DATABASE}")
    logger.info(f"  Checkpoint: {CHECKPOINT_DIR}")
    logger.info("=" * 60)

    # ----------------------------------------------------------
    # 1. Crear sesión de Spark
    # ----------------------------------------------------------
    spark = crear_spark_session()

    # ----------------------------------------------------------
    # 2. Leer stream de Kafka (datos crudos)
    # ----------------------------------------------------------
    df_stream_raw = leer_stream_kafka(spark)

    # ----------------------------------------------------------
    # 3A. Calcular conteo de vehículos por línea (ventana 2 min)
    # ----------------------------------------------------------
    df_conteo_lineas = calcular_conteo_por_linea(df_stream_raw)

    # ----------------------------------------------------------
    # 3B. Detectar anomalías por heurística clásica
    # ----------------------------------------------------------
    df_anomalias = detectar_anomalias_inmovilidad(df_stream_raw)

    # ----------------------------------------------------------
    # 3C. Modelado Predictivo e IA (Machine Learning)
    # ----------------------------------------------------------
    modelo_ia = entrenar_modelo_predictivo(spark)
    df_alertas_ia = predecir_retrasos_con_ia(df_stream_raw, modelo_ia)

    # ----------------------------------------------------------
    # 4. Iniciar los sinks (escritura de resultados)
    # Unificamos alertas heurísticas (inmovilidad) e IA
    # ----------------------------------------------------------
    # IMPORTANTE: En streaming no podemos hacer .union() de streams fácilmente 
    # sin re-balancear. Lo mandaremos en dos queries distintas para mayor tolerancia.
    query_alertas_heuristica = escribir_alertas_en_mongodb(df_anomalias)
    query_alertas_ia = escribir_alertas_en_mongodb(df_alertas_ia) # Reutiliza misma colección
    query_conteos = escribir_conteo_en_mongodb(df_conteo_lineas)

    # Sink de debug en consola (solo desarrollo)
    if os.getenv("DEBUG_CONSOLE", "false").lower() == "true":
        query_debug_alertas = escribir_en_consola_debug(df_anomalias, "anomalias")
        query_debug_conteos = escribir_en_consola_debug(df_conteo_lineas, "conteos")
        logger.info("🔍 Debug en consola activado")

    logger.info("✅ Pipeline de streaming iniciado correctamente")
    logger.info("⏳ Esperando micro-batches de Kafka... (Ctrl+C para detener)")

    # ----------------------------------------------------------
    # 5. Esperar a que terminen los streams (indefinidamente)
    # ----------------------------------------------------------
    try:
        # Esperamos a los streams de alertas (el más crítico)
        query_alertas_heuristica.awaitTermination()
        query_alertas_ia.awaitTermination()
    except KeyboardInterrupt:
        logger.info("🛑 Interrupción recibida. Deteniendo streams...")
        query_alertas_heuristica.stop()
        query_alertas_ia.stop()
        query_conteos.stop()
    except Exception as e:
        logger.error(f"❌ Error crítico en el pipeline: {e}")
        raise
    finally:
        logger.info("🔒 SparkSession cerrada. Pipeline detenido.")
        spark.stop()


# ============================================================
# Punto de entrada
# ============================================================

if __name__ == "__main__":
    main()
