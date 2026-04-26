unsigned long lastMeasurement = 0;

void setup() {

  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);

  Wire.begin(I2C_SDA, I2C_SCL);

  Serial.println("=== INICIANDO SISTEMA ===");

  ina219Init();

  wifiConnect();

  mqttConnect();
}

void loop() {

  if (!wifiCheck()) wifiReconnect();

  if (!mqttCheck()) mqttReconnect();

  client.loop();

  if (millis() - lastMeasurement > MEASUREMENT_INTERVAL) {

    lastMeasurement = millis();

    String data = readSensors();

    if (data.length() > 0) {

      Serial.println(data);

      publishData(data);
    }
  }

  delay(50);
}