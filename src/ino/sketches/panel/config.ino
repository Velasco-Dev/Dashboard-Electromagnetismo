// WiFi
#define WIFI_CONFIG_TIMEOUT 15

// MQTT
#define MQTT_TOPIC_DATA "solar/data"
#define MQTT_TOPIC_STATUS "solar/status"
#define MQTT_KEEPALIVE 60
#define MQTT_RECONNECT_DELAY 5000

// I2C
#define I2C_SCL 22
#define I2C_SDA 21
#define I2C_FREQ 400000

// INA219
#define INA219_PANEL 0x40
#define INA219_BATTERY 0x41
#define INA219_LOAD 0x42

#define SHUNT_OHMS 0.1

// Sistema
#define MEASUREMENT_INTERVAL 5000
#define LED_PIN 2
#define DEBUG true
#define WATCHDOG_TIMEOUT 30