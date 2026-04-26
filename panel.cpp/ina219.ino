#include <Wire.h>
#include <Adafruit_INA219.h>

Adafruit_INA219 panel(INA219_PANEL);
Adafruit_INA219 battery(INA219_BATTERY);
Adafruit_INA219 load(INA219_LOAD);

void ina219Init() {
  Serial.println("=== INICIALIZANDO INA219 ===");

  Serial.print("Panel (0x");
  Serial.print(INA219_PANEL, HEX);
  Serial.print("): ");

  if (!panel.begin()) {
    Serial.println("ERROR");
  } else {
    Serial.println("OK");
  }

  Serial.print("Battery (0x");
  Serial.print(INA219_BATTERY, HEX);
  Serial.print("): ");

  if (!battery.begin()) {
    Serial.println("ERROR");
  } else {
    Serial.println("OK");
  }

  Serial.print("Load (0x");
  Serial.print(INA219_LOAD, HEX);
  Serial.print("): ");

  if (!load.begin()) {
    Serial.println("ERROR");
  } else {
    Serial.println("OK");
  }
}

String readSensors() {
  float vp = panel.getBusVoltage_V();
  float ip = panel.getCurrent_mA() / 1000;

  float vb = battery.getBusVoltage_V();
  float ib = battery.getCurrent_mA() / 1000;

  float vl = load.getBusVoltage_V();
  float il = load.getCurrent_mA() / 1000;

  float power = vp * ip;

  // Crear JSON válido
  String json = "{";
  json += "\"panel_voltage\":" + String(vp, 2) + ",";
  json += "\"panel_current\":" + String(ip, 2) + ",";
  json += "\"battery_voltage\":" + String(vb, 2) + ",";
  json += "\"battery_current\":" + String(ib, 2) + ",";
  json += "\"load_voltage\":" + String(vl, 2) + ",";
  json += "\"load_current\":" + String(il, 2) + ",";
  json += "\"power\":" + String(power, 2);
  json += "}";

  // Validar JSON antes de enviarlo
  if (json[json.length() - 1] != '}') {
    Serial.println("⚠️ Error: JSON no válido");
    return "{}"; // Retornar JSON vacío en caso de error
  }

  return json;
}