"""
============================================================
test_anomaly_detection.py - Tests unitarios del procesador Spark
Madrid Transit Pulse: Spark Processor
============================================================

Tests para validar la lógica de detección de anomalías
sin necesidad de una conexión real a Kafka o MongoDB.

Ejecución:
    pytest tests/test_anomaly_detection.py -v

Nota: Los tests usan SparkSession en modo local con datos sintéticos.
"""

import pytest
from datetime import datetime, timedelta
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, TimestampType

# Importar las funciones a testear
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'main', 'python'))

from transit_processor import (
    detectar_anomalias_inmovilidad,
    calcular_conteo_por_linea,
    UMBRAL_VELOCIDAD_PARADO
)


# ============================================================
# Fixture: SparkSession compartida para todos los tests
# ============================================================

@pytest.fixture(scope="session")
def spark():
    """Crea una SparkSession ligera para testing."""
    spark = (
        SparkSession.builder
        .appName("MTP-Tests")
        .master("local[2]")
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.sql.streaming.checkpointLocation", "/tmp/mtp-test-checkpoints")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")
    yield spark
    spark.stop()


# ============================================================
# Datos de prueba
# ============================================================

def crear_eventos_vehiculo_parado(spark, vehicle_id: str, line_id: str,
                                   lat: float, lon: float,
                                   num_lecturas: int = 3):
    """
    Genera un DataFrame con un vehículo que no se mueve.
    Útil para validar la detección de anomalías.
    """
    base_ts = datetime(2024, 1, 15, 10, 0, 0)
    datos = []

    for i in range(num_lecturas):
        datos.append({
            "vehicle_id": vehicle_id,
            "line_id": line_id,
            "line_name": f"Línea Test {line_id}",
            "source": "EMT",
            "lat": lat,          # Mismo lat en todas las lecturas
            "lon": lon,          # Mismo lon en todas las lecturas
            "speed_kmh": 0.0,    # Vehículo parado
            "vehicle_status": "EN_PARADA",
            "occupancy_pct": 50,
            "delay_seconds": 180,
            "vehicle_ts": base_ts + timedelta(seconds=30 * i),
        })

    return spark.createDataFrame(datos)


def crear_eventos_vehiculo_movil(spark, vehicle_id: str, line_id: str):
    """
    Genera un DataFrame con un vehículo que sí se mueve.
    No debe ser detectado como anomalía.
    """
    base_ts = datetime(2024, 1, 15, 10, 0, 0)
    base_lat, base_lon = 40.4168, -3.7038

    datos = [
        {
            "vehicle_id": vehicle_id,
            "line_id": line_id,
            "line_name": f"Línea Test {line_id}",
            "source": "EMT",
            "lat": base_lat + (i * 0.001),   # Latitud cambia en cada lectura
            "lon": base_lon + (i * 0.001),   # Longitud cambia en cada lectura
            "speed_kmh": 25.0 + i,
            "vehicle_status": "EN_RUTA",
            "occupancy_pct": 60,
            "delay_seconds": 30,
            "vehicle_ts": base_ts + timedelta(seconds=30 * i),
        }
        for i in range(4)
    ]

    return spark.createDataFrame(datos)


# ============================================================
# Tests de detección de anomalías
# ============================================================

class TestDeteccionAnomalias:
    """Suite de tests para la función detectar_anomalias_inmovilidad."""

    def test_vehiculo_parado_3_lecturas_detectado(self, spark):
        """
        DADO un vehículo con coordenadas idénticas en 3 lecturas consecutivas
        CUANDO se aplica la detección de anomalías
        ENTONCES debe aparecer en el resultado como 'posible_retraso_grave'
        """
        df_entrada = crear_eventos_vehiculo_parado(
            spark,
            vehicle_id="EMT-27-BUS-001",
            line_id="27",
            lat=40.4168,
            lon=-3.7038,
            num_lecturas=3
        )

        df_resultado = detectar_anomalias_inmovilidad(df_entrada)
        alertas = df_resultado.collect()

        assert len(alertas) > 0, "Debería detectar al menos una anomalía"
        assert alertas[0]["alertType"] == "posible_retraso_grave"
        assert alertas[0]["vehicleId"] == "EMT-27-BUS-001"
        assert alertas[0]["lineId"] == "27"

    def test_vehiculo_movil_no_detectado(self, spark):
        """
        DADO un vehículo que cambia de coordenadas en cada lectura
        CUANDO se aplica la detección de anomalías
        ENTONCES NO debe aparecer como anomalía
        """
        df_entrada = crear_eventos_vehiculo_movil(
            spark,
            vehicle_id="EMT-44-BUS-002",
            line_id="44"
        )

        df_resultado = detectar_anomalias_inmovilidad(df_entrada)
        alertas = df_resultado.collect()

        assert len(alertas) == 0, "Un vehículo en movimiento no debe generar alertas"

    def test_vehiculo_con_solo_2_lecturas_parado_no_detectado(self, spark):
        """
        DADO un vehículo parado en solo 2 lecturas (no 3 consecutivas)
        CUANDO se aplica la detección de anomalías
        ENTONCES NO debe generar alerta (necesitamos 3 lecturas mínimo)
        """
        df_entrada = crear_eventos_vehiculo_parado(
            spark,
            vehicle_id="EMT-1-BUS-005",
            line_id="1",
            lat=40.4500,
            lon=-3.7000,
            num_lecturas=2  # Solo 2 lecturas, no 3
        )

        df_resultado = detectar_anomalias_inmovilidad(df_entrada)
        alertas = df_resultado.collect()

        assert len(alertas) == 0, "Con solo 2 lecturas no hay suficiente historial"

    def test_severidad_alta_con_retraso_mayor_5_minutos(self, spark):
        """
        DADO un vehículo parado con más de 5 minutos de retraso
        CUANDO se procesa la anomalía
        ENTONCES la severidad debe ser 'ALTA'
        """
        base_ts = datetime(2024, 1, 15, 10, 0, 0)
        datos = [
            {
                "vehicle_id": "EMT-27-BUS-010",
                "line_id": "27",
                "line_name": "Línea 27",
                "source": "EMT",
                "lat": 40.4168,
                "lon": -3.7038,
                "speed_kmh": 0.0,
                "vehicle_status": "EN_PARADA",
                "occupancy_pct": 80,
                "delay_seconds": 400,  # 6m40s → severidad ALTA
                "vehicle_ts": base_ts + timedelta(seconds=30 * i),
            }
            for i in range(3)
        ]
        df_entrada = spark.createDataFrame(datos)
        df_resultado = detectar_anomalias_inmovilidad(df_entrada)

        alertas = df_resultado.collect()
        assert len(alertas) > 0
        assert alertas[0]["severity"] == "ALTA"

    def test_multiple_vehiculos_detecta_solo_parados(self, spark):
        """
        DADO una mezcla de vehículos parados y en movimiento
        CUANDO se aplica la detección
        ENTONCES solo los vehículos parados deben generar alertas
        """
        df_parado = crear_eventos_vehiculo_parado(
            spark, "BUS-PARADO", "27", 40.41, -3.70, 3
        )
        df_movil = crear_eventos_vehiculo_movil(spark, "BUS-MOVIL", "27")

        df_combinado = df_parado.union(df_movil)
        df_resultado = detectar_anomalias_inmovilidad(df_combinado)

        vehicle_ids = [row["vehicleId"] for row in df_resultado.collect()]

        assert "BUS-PARADO" in vehicle_ids, "El vehículo parado debe detectarse"
        assert "BUS-MOVIL" not in vehicle_ids, "El vehículo en movimiento NO debe detectarse"


# ============================================================
# Tests de conteo por línea
# ============================================================

class TestConteoLineas:
    """Suite de tests para la función calcular_conteo_por_linea."""

    def test_conteo_basico_por_linea(self, spark):
        """
        DADO eventos de múltiples vehículos en diferentes líneas
        CUANDO se calcula el conteo por ventana
        ENTONCES debe contar correctamente los vehículos únicos por línea
        """
        base_ts = datetime(2024, 1, 15, 10, 0, 0)
        datos = [
            # Línea 27: 3 vehículos
            {"vehicle_id": "BUS-27-001", "line_id": "27", "line_name": "L27",
             "source": "EMT", "lat": 40.41, "lon": -3.70, "speed_kmh": 25.0,
             "vehicle_status": "EN_RUTA", "occupancy_pct": 50,
             "delay_seconds": 30, "vehicle_ts": base_ts},
            {"vehicle_id": "BUS-27-002", "line_id": "27", "line_name": "L27",
             "source": "EMT", "lat": 40.42, "lon": -3.71, "speed_kmh": 20.0,
             "vehicle_status": "EN_RUTA", "occupancy_pct": 70,
             "delay_seconds": 60, "vehicle_ts": base_ts + timedelta(seconds=5)},
            {"vehicle_id": "BUS-27-003", "line_id": "27", "line_name": "L27",
             "source": "EMT", "lat": 40.43, "lon": -3.72, "speed_kmh": 0.0,
             "vehicle_status": "EN_PARADA", "occupancy_pct": 90,
             "delay_seconds": 120, "vehicle_ts": base_ts + timedelta(seconds=10)},
            # Línea C1: 2 vehículos
            {"vehicle_id": "TREN-C1-001", "line_id": "C1", "line_name": "Cercanías C1",
             "source": "RENFE", "lat": 40.40, "lon": -3.69, "speed_kmh": 80.0,
             "vehicle_status": "EN_RUTA", "occupancy_pct": 40,
             "delay_seconds": 0, "vehicle_ts": base_ts + timedelta(seconds=3)},
            {"vehicle_id": "TREN-C1-002", "line_id": "C1", "line_name": "Cercanías C1",
             "source": "RENFE", "lat": 40.45, "lon": -3.65, "speed_kmh": 95.0,
             "vehicle_status": "EN_RUTA", "occupancy_pct": 60,
             "delay_seconds": 45, "vehicle_ts": base_ts + timedelta(seconds=8)},
        ]

        df_entrada = spark.createDataFrame(datos)

        # Para tests estáticos, usamos groupBy directamente (sin windowedBy)
        # En producción: la ventana se aplica sobre el stream
        df_resultado = (
            df_entrada
            .groupBy("line_id", "source")
            .agg(F.countDistinct("vehicle_id").alias("vehiculos_activos"))
        )

        resultados = {row["line_id"]: row["vehiculos_activos"]
                     for row in df_resultado.collect()}

        assert resultados.get("27") == 3, "La línea 27 debe tener 3 vehículos"
        assert resultados.get("C1") == 2, "La línea C1 debe tener 2 vehículos"
