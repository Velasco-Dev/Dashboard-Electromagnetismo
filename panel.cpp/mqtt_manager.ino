#include <PubSubClient.h>
#include <WiFi.h>

WiFiClient espClient;
PubSubClient client(espClient);

void mqttConnect() {

  client.setServer(MQTT_BROKER, MQTT_PORT);

  Serial.println("Configurando MQTT");

}

bool mqttCheck() {
  return client.connected();
}

void mqttReconnect() {

  static unsigned long lastAttempt = 0;

  if (millis() - lastAttempt < MQTT_RECONNECT_DELAY)
    return;

  lastAttempt = millis();

  Serial.print("Intentando conexión MQTT...");

  if (client.connect(MQTT_CLIENT_ID)) {

    Serial.println("Conectado");
    client.publish(MQTT_TOPIC_STATUS, "online");

  } else {

    Serial.print("falló rc=");
    Serial.println(client.state());
  }
}

void publishStatus() {

  String status = "{";
  status += "\"device\":\"esp32\",";
  status += "\"status\":\"online\"";
  status += "}";

  client.publish(MQTT_TOPIC_STATUS, status.c_str());
}

bool mqttCheck() {
  return client.connected();
}

void mqttReconnect() {
  mqttConnect();
}

void publishData(String data) {
  if (client.connected()) {
    client.publish(MQTT_TOPIC_DATA, data.c_str());
    Serial.println("Datos publicados en MQTT");
  }
}