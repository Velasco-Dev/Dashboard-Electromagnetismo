#include <Wire.h>
#include <Adafruit_INA219.h>

Adafruit_INA219 panel(INA219_PANEL);
Adafruit_INA219 battery(INA219_BATTERY);
Adafruit_INA219 load(INA219_LOAD);

void ina219Init() {

  if (!panel.begin()) {
    Serial.println("INA219 PANEL ERROR");
  }

  if (!battery.begin()) {
    Serial.println("INA219 BATTERY ERROR");
  }

  if (!load.begin()) {
    Serial.println("INA219 LOAD ERROR");
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

  String json = "{";

  json += "\"panel_voltage\":" + String(vp,2) + ",";
  json += "\"panel_current\":" + String(ip,2) + ",";
  json += "\"battery_voltage\":" + String(vb,2) + ",";
  json += "\"battery_current\":" + String(ib,2) + ",";
  json += "\"load_voltage\":" + String(vl,2) + ",";
  json += "\"load_current\":" + String(il,2) + ",";
  json += "\"power\":" + String(power,2);

  json += "}";

  return json;
}