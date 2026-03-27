#include <Wire.h>

unsigned long lastMeasurement = 0;
bool ejecutado = false;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  Wire.begin(I2C_SDA, I2C_SCL);

  Serial.println("=== INICIANDO SISTEMA ===");

  wifiConnect();
  mqttConnect();
}

void loop() {





  if (!ejecutado) {

    if (!wifiCheck()) wifiReconnect();
    if (!mqttCheck()) mqttReconnect();

    client.loop(); // ✅ correcto

    String data = readSensors();

    if (data.length() > 0) {
      Serial.println(data);
      publishData(data);
    } else {
      Serial.println("Error sensores");
    }

    ejecutado = true;
  }

  // mantener sistema vivo
  if (!wifiCheck()) wifiReconnect();
  if (!mqttCheck()) mqttReconnect();

  client.loop(); // ✅ correcto

  delay(50);
}