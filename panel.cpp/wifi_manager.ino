#include <WiFi.h>

bool wifiConnected = false;
int reconnectAttempts = 0;

void wifiConnect() {
  Serial.println("Conectando WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int timeout = WIFI_CONFIG_TIMEOUT;

  while (WiFi.status() != WL_CONNECTED && timeout--) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi conectado");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
  } else {
    wifiConnected = false;
    Serial.println("\nError WiFi");
  }
}

bool wifiCheck() {
  return WiFi.status() == WL_CONNECTED;
}

void wifiReconnect() {
  if (!wifiCheck()) {
    reconnectAttempts++;
    Serial.println("Reconectando WiFi...");
    WiFi.disconnect(true); 
    delay(2000);
    wifiConnect();
  }
}