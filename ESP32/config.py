# Configuración del sistema IoT fotovoltaico ESP32
# @author Sistema IoT Fotovoltaico


# Importar credenciales desde .env.py
try:
    from .env import WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID
except ImportError:
    from .env import WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID

# Configuración WiFi
WIFI_CONFIG = {
    'SSID': WIFI_SSID,
    'PASSWORD': WIFI_PASSWORD,
    'TIMEOUT': 15
}

# Configuración MQTT
MQTT_CONFIG = {
    'BROKER': MQTT_BROKER,
    'PORT': MQTT_PORT,
    'CLIENT_ID': MQTT_CLIENT_ID,
    'TOPIC_DATA': 'solar/data',
    'TOPIC_STATUS': 'solar/status',
    'KEEPALIVE': 60,
    'RECONNECT_DELAY': 5
}

# Configuración de sensores INA219
SENSORS_CONFIG = {
    'I2C_SCL': 22,                  # Pin SCL para I2C
    'I2C_SDA': 21,                  # Pin SDA para I2C
    'I2C_FREQ': 400000,             # Frecuencia I2C en Hz
    
    # Direcciones I2C de los sensores INA219
    'INA219_PANEL': 0x40,           # Sensor del panel solar
    'INA219_BATTERY': 0x41,         # Sensor de la batería
    'INA219_LOAD': 0x42,            # Sensor del consumo (opcional)
    
    # Calibración INA219 (ajustar según hardware)
    'SHUNT_OHMS': 0.1,              # Resistencia del shunt en ohms
    'MAX_EXPECTED_AMPS': 3.2        # Máxima corriente esperada
}

# Configuración del sistema
SYSTEM_CONFIG = {
    'MEASUREMENT_INTERVAL': 5,      # Intervalo entre mediciones (segundos)
    'LED_PIN': 2,                   # Pin del LED integrado
    'DEBUG': True,                  # Habilitar debug
    'WATCHDOG_TIMEOUT': 30          # Timeout del watchdog (segundos)
}

# Configuración de datos
DATA_CONFIG = {
    'VOLTAGE_OFFSET': 0.0,          # Offset de calibración voltaje
    'CURRENT_OFFSET': 0.0,          # Offset de calibración corriente
    'POWER_FACTOR': 1.0,            # Factor de corrección potencia
    'FILTER_SAMPLES': 3             # Número de muestras para filtro
}