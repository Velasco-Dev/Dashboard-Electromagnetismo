# config.py
# Configuración del sistema IoT fotovoltaico ESP32

from env import WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID

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
    'I2C_SCL': 22,
    'I2C_SDA': 21,
    'I2C_FREQ': 400000,

    'INA219_PANEL': 0x40,
    'INA219_BATTERY': 0x41,
    'INA219_LOAD': 0x42,

    'SHUNT_OHMS': 0.1,
    'MAX_EXPECTED_AMPS': 3.2
}

# Configuración del sistema
SYSTEM_CONFIG = {
    'MEASUREMENT_INTERVAL': 5,
    'LED_PIN': 2,
    'DEBUG': True,
    'WATCHDOG_TIMEOUT': 30
}

# Configuración de datos
DATA_CONFIG = {
    'VOLTAGE_OFFSET': 0.0,
    'CURRENT_OFFSET': 0.0,
    'POWER_FACTOR': 1.0,
    'FILTER_SAMPLES': 3
}
