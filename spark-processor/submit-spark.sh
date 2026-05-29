#!/bin/bash
# ============================================================
# submit-spark.sh - Script de envío del job a Spark
# Madrid Transit Pulse: Spark Processor
# ============================================================
# Uso:
#   ./submit-spark.sh [local|cluster]
#
# Modos:
#   local   → Spark local[*] para desarrollo (default)
#   cluster → Spark standalone o YARN para producción
# ============================================================

set -euo pipefail

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Modo de ejecución
MODE="${1:-local}"

# ----------------------------------------------------------
# Variables de entorno (override con export antes de ejecutar)
# ----------------------------------------------------------
export KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"
export MONGO_URI="${MONGO_URI:-mongodb://mtp_app:mtp_secure_pass@localhost:27017}"
export MONGO_DATABASE="${MONGO_DATABASE:-madrid_transit}"
export CHECKPOINT_DIR="${CHECKPOINT_DIR:-/tmp/mtp-spark-checkpoints}"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"
export DEBUG_CONSOLE="${DEBUG_CONSOLE:-false}"

echo "============================================================"
echo "🚇 Madrid Transit Pulse - Spark Submit"
echo "============================================================"
echo "  Modo:         $MODE"
echo "  Kafka:        $KAFKA_BOOTSTRAP_SERVERS"
echo "  MongoDB:      $(echo $MONGO_URI | sed 's/:\/\/.*@/:\/\/***:***@/')"
echo "  Checkpoint:   $CHECKPOINT_DIR"
echo "============================================================"

# ----------------------------------------------------------
# Packages de Maven necesarios:
# - spark-sql-kafka: Conector Kafka para Structured Streaming
# - mongo-spark-connector: Conector MongoDB para el sink
# ----------------------------------------------------------
SPARK_PACKAGES=(
    "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0"
    "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0"
)

# Unir los packages con coma
PACKAGES_STRING=$(IFS=,; echo "${SPARK_PACKAGES[*]}")

# ----------------------------------------------------------
# Configuración de Spark según el modo
# ----------------------------------------------------------
if [ "$MODE" = "local" ]; then
    SPARK_MASTER="local[*]"
    DRIVER_MEMORY="2g"
    EXECUTOR_MEMORY="2g"
    NUM_EXECUTORS="1"
else
    # Modo cluster (ajustar según infraestructura)
    SPARK_MASTER="${SPARK_MASTER_URL:-spark://localhost:7077}"
    DRIVER_MEMORY="4g"
    EXECUTOR_MEMORY="4g"
    NUM_EXECUTORS="3"
fi

# ----------------------------------------------------------
# Ejecutar spark-submit
# ----------------------------------------------------------
spark-submit \
    --master "$SPARK_MASTER" \
    --packages "$PACKAGES_STRING" \
    --driver-memory "$DRIVER_MEMORY" \
    --executor-memory "$EXECUTOR_MEMORY" \
    --num-executors "$NUM_EXECUTORS" \
    --conf "spark.sql.shuffle.partitions=8" \
    --conf "spark.serializer=org.apache.spark.serializer.KryoSerializer" \
    --conf "spark.streaming.stopGracefullyOnShutdown=true" \
    --conf "spark.sql.streaming.checkpointLocation=$CHECKPOINT_DIR" \
    --name "MadridTransitPulse-StreamProcessor" \
    "$SCRIPT_DIR/src/main/python/transit_processor.py"

echo "✅ Job de Spark finalizado."
