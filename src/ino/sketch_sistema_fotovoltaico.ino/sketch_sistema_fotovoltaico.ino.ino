#include <WiFi.h>              // Librería WiFi del ESP32
#include <PubSubClient.h>      // Librería para MQTT
#include <Wire.h>              // Comunicación I2C
#include <Adafruit_INA219.h>   // Librería del sensor INA219

// ================== WIFI ==================
const char* ssid = "FAMILIA_URBANO2G";        // Nombre de tu red WiFi
const char* password = "1061804052";    // Contraseña WiFi

// ================== MQTT ==================
const char* mqtt_server = "broker.hivemq.com"; // Broker público

WiFiClient espClient;
PubSubClient client(espClient);

// ================== SENSOR ==================
Adafruit_INA219 ina219;

// ================== FUNCION WIFI ==================
void setup_wifi() {
  Serial.println("Conectando a WiFi...");
  
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado!");
}

// ================== FUNCION MQTT ==================
void reconnect() {
  while (!client.connected()) {
    Serial.println("Conectando a MQTT...");
    
    if (client.connect("ESP32Client")) {
      Serial.println("Conectado a MQTT!");
    } else {
      Serial.print("Error, rc=");
      Serial.print(client.state());
      delay(2000);
    }
  }
}

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);

  Wire.begin(21, 22); // SDA = 21, SCL = 22

  // Inicializa el sensor INA219
  if (!ina219.begin()) {
    Serial.println("No se encontró INA219");
    while (1) { delay(10); }
  }

  setup_wifi();

  client.setServer(mqtt_server, 1883);
}

// ================== LOOP ==================
void loop() {

  // Mantener conexión MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // ================== LECTURA DEL SENSOR ==================
  
  float voltage = ina219.getBusVoltage_V(); // Voltaje en el bus
  float current = ina219.getCurrent_mA() / 1000.0; // Corriente en Amperios
  float power = voltage * current; // Potencia

  // ================== ENVÍO MQTT ==================
  
  client.publish("solar/panel/voltage", String(voltage).c_str());
  client.publish("solar/panel/current", String(current).c_str());
  client.publish("solar/system/power", String(power).c_str());

  // ================== DEBUG SERIAL ==================
  
  Serial.print("Voltaje: ");
  Serial.print(voltage);
  Serial.print(" V | Corriente: ");
  Serial.print(current);
  Serial.print(" A | Potencia: ");
  Serial.println(power);

  delay(1000); // cada 1 segundo
}