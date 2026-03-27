#include <PubSubClient.h>
#include <WiFi.h>

WiFiClient espClient;
PubSubClient client(espClient);

void mqttConnect() {
  client.setServer(MQTT_BROKER, MQTT_PORT);
  
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT...");
    if (client.connect(MQTT_CLIENT_ID)) {
      Serial.println("Conectado");
      client.publish(MQTT_TOPIC_STATUS, "online");
    } else {
      Serial.print("falló, rc=");
      Serial.print(client.state());
      Serial.println(" reintentando en 5 segundos");
      delay(5000);
    }
  }
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