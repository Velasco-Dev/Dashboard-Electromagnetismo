#include <Wire.h>

class INA219 {
public:
  uint8_t addr;

  INA219(uint8_t address) {
    addr = address;
  }

  float readVoltage() {
    return random(120, 150) / 10.0; // simulado
  }

  float readCurrent() {
    return random(10, 30) / 10.0;
  }
};

INA219 panel(INA219_PANEL);
INA219 battery(INA219_BATTERY);
INA219 load(INA219_LOAD);

String readSensors() {
  float vp = panel.readVoltage();
  float ip = panel.readCurrent();

  float vb = battery.readVoltage();
  float ib = battery.readCurrent();

  float il = load.readCurrent();

  String json = "{";
  json += "\"panel_voltage\":" + String(vp,2) + ",";
  json += "\"panel_current\":" + String(ip,2) + ",";
  json += "\"battery_voltage\":" + String(vb,2) + ",";
  json += "\"battery_current\":" + String(ib,2) + ",";
  json += "\"load_current\":" + String(il,2);
  json += "}";

  return json;
}