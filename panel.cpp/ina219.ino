#include <Wire.h>
#include <Adafruit_INA219.h>
#include "config.h"

Adafruit_INA219 panel(INA219_PANEL);
Adafruit_INA219 battery(INA219_BATTERY);
Adafruit_INA219 load(INA219_LOAD);

// PROTOTIPOS ✅ (CORREGIDOS)
float stableVoltage(Adafruit_INA219 &s);
float stableCurrent(Adafruit_INA219 &s); 
bool ina219Detected = false;

float stableVoltage(Adafruit_INA219 &s) {
  float v = 0;
  for (int i = 0; i < 3; i++) {
    v = s.getBusVoltage_V();
    delay(5);
  }
  return v;
}

float stableCurrent(Adafruit_INA219 &s) {
  float i = 0;
  for (int i2 = 0; i2 < 3; i2++) {
    i = s.getCurrent_mA();
    delay(5);
  }
  return i / 1000.0;
}

// ===== ESCANEO I2C =====
void scanI2C() {
  Serial.println("\n=== ESCANEANDO I2C ===");

  int devices = 0;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Dispositivo detectado en 0x");
      Serial.print(address, HEX);

      // 🔥 IDENTIFICACIÓN
      if (address == INA219_PANEL) {
        Serial.print(" -> PANEL");
      } 
      else if (address == INA219_BATTERY) {
        Serial.print(" -> BATERIA");
      } 
      else if (address == INA219_LOAD) {
        Serial.print(" -> CARGA");
      } 
      else {
        Serial.print(" -> DESCONOCIDO");
      }

      Serial.println();
      devices++;
    }
  }

  if (devices == 0) {
    Serial.println("⚠️ No se detectaron dispositivos I2C");
  }

  Serial.println("======================\n");
}

void ina219Init() {
  Serial.println("=== INICIALIZANDO INA219 ===");

  panel.begin();
  battery.begin();
  load.begin();

  panel.setCalibration_32V_2A();
  battery.setCalibration_32V_2A();
  load.setCalibration_32V_2A();

  delay(250);
}

String readSensors() {

 

  // ===== PANEL =====
  float vp_bus = panel.getBusVoltage_V();
  float vp_shunt = panel.getShuntVoltage_mV();
  float vp = vp_bus + (vp_shunt / 1000.0);
  float ip = panel.getCurrent_mA() / 1000.0;
  float pp = panel.getPower_mW() / 1000.0;

  // ===== BATERÍA =====
  float vb_bus = battery.getBusVoltage_V();
  float vb_shunt = battery.getShuntVoltage_mV();
  float vb = vb_bus + (vb_shunt / 1000.0);
  float ib = battery.getCurrent_mA() / 1000.0;
  float pb = battery.getPower_mW() / 1000.0;

  // ===== CARGA =====
  float vl_bus = load.getBusVoltage_V();
  float vl_shunt = load.getShuntVoltage_mV();
  float vl = vl_bus + (vl_shunt / 1000.0);
  float il = load.getCurrent_mA() / 1000.0;
  float pl = load.getPower_mW() / 1000.0;

  String json = "{";

  json += "\"panel_voltage\":" + String(vp, 2) + ",";
  json += "\"panel_current\":" + String(ip, 3) + ",";
  json += "\"panel_power\":" + String(pp, 2) + ",";

  json += "\"battery_voltage\":" + String(vb, 2) + ",";
  json += "\"battery_current\":" + String(ib, 3) + ",";
  json += "\"battery_power\":" + String(pb, 2) + ",";

  json += "\"load_voltage\":" + String(vl, 2) + ",";
  json += "\"load_current\":" + String(il, 3) + ",";
  json += "\"load_power\":" + String(pl, 2);

  json += "}";

  return json;
}