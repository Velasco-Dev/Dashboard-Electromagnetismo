#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Adafruit_INA219.h>
#include "config.h"   // 🔥 IMPORTANTE: usar tu archivo

// ===== MQTT CLIENT =====
WiFiClientSecure espClient;
PubSubClient client(espClient);

// ===== PROTOTIPOS =====
void ina219Init();
String readSensors();

void wifiConnect();
bool wifiCheck();
void wifiReconnect();

void mqttConnect();
bool mqttCheck();
void mqttReconnect();
void publishData(String data);

// ===== VARIABLES =====
unsigned long lastMeasurement = 0;



// ===== SETUP =====
void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);

  // 🔥 Inicializar I2C con tu config
  Wire.begin(I2C_SDA, I2C_SCL);

  Serial.println("=== INICIANDO SISTEMA ===");
  delay(1000);

  scanI2C();        // 🔥 DEBUG CLAVE

  ina219Init();     // Sensores
  wifiConnect();    // WiFi

  // 🔥 asegurar conexión real antes de MQTT
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  mqttConnect();    // MQTT
}

// ===== LOOP =====
void loop() {

  if (!wifiCheck()) wifiReconnect();
  if (!mqttCheck()) mqttReconnect();

  client.loop();
  

  if (millis() - lastMeasurement > MEASUREMENT_INTERVAL) {
    lastMeasurement = millis();

    String data = readSensors();

    if (data.length() > 0) {
      Serial.println("\n=== DATOS ===");
      Serial.println(data);

      publishData(data);

      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
  }

  delay(50);
}