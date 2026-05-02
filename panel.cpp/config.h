// WIFI
#define WIFI_SSID "FAMILIA_URBANO2G"
#define WIFI_PASSWORD "1061804052"

// MQTT
#define MQTT_BROKER "81f19fbf222f43c9a70f4d8fbf68f0f1.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "esp32_solar_001"
#define MQTT_USER "alvarolpz43"
#define MQTT_PASSWORD "12345678Aj"

#define MQTT_TOPIC_DATA "panel/data"
#define MQTT_TOPIC_STATUS "panel/status"

#define MQTT_RECONNECT_DELAY 5000
#define WIFI_CONFIG_TIMEOUT 20

// HARDWARE
#define LED_PIN 2
#define I2C_SDA 21
#define I2C_SCL 22

// INA219
#define INA219_PANEL 0x40
#define INA219_BATTERY 0x44 
#define INA219_LOAD 0x41

// TIEMPO
#define MEASUREMENT_INTERVAL 2000