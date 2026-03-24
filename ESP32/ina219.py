# Modulo INA219 para ESP32 - Sistema IoT Fotovoltaico
# Maneja la lectura de sensores INA219 para panel, bateria y consumo

import time
from machine import I2C, Pin
from config import SENSORS_CONFIG, SYSTEM_CONFIG


class INA219:
    """
    Driver basico para el sensor INA219.
    Mide voltaje, corriente, potencia y voltaje en shunt.
    """

    # Registros INA219
    REG_CONFIG = 0x00
    REG_SHUNT_VOLTAGE = 0x01
    REG_BUS_VOLTAGE = 0x02
    REG_POWER = 0x03
    REG_CURRENT = 0x04
    REG_CALIBRATION = 0x05

    def __init__(self, i2c, address=0x40):
        self.i2c = i2c
        self.address = address

        # 100 uA por bit
        self.current_lsb = 0.0001

        # 20 * current_lsb
        self.power_lsb = 0.002

        self._configure()

    def _configure(self):
        """
        Configura el sensor INA219:
        - Rango bus: 32V
        - Ganancia shunt: ±320mV
        - ADC 12 bits
        - Modo continuo
        """
        config = 0x399F
        self._write_register(self.REG_CONFIG, config)

        shunt_ohms = SENSORS_CONFIG['SHUNT_OHMS']
        calibration = int(0.04096 / (self.current_lsb * shunt_ohms))
        self._write_register(self.REG_CALIBRATION, calibration)

        time.sleep_ms(100)

    def _write_register(self, register, value):
        """
        Escribe un entero de 16 bits en un registro.
        """
        data = bytes([(value >> 8) & 0xFF, value & 0xFF])
        self.i2c.writeto_mem(self.address, register, data)

    def _read_register(self, register):
        """
        Lee un entero de 16 bits desde un registro.
        """
        data = self.i2c.readfrom_mem(self.address, register, 2)
        return (data[0] << 8) | data[1]

    def _to_signed(self, value):
        """
        Convierte un valor de 16 bits a entero con signo.
        """
        if value > 32767:
            value -= 65536
        return value

    def read_bus_voltage(self):
        """
        Lee el voltaje del bus en voltios.
        """
        raw = self._read_register(self.REG_BUS_VOLTAGE)
        voltage = (raw >> 3) * 0.004
        return round(voltage, 3)

    def read_shunt_voltage(self):
        """
        Lee el voltaje del shunt en milivoltios.
        """
        raw = self._to_signed(self._read_register(self.REG_SHUNT_VOLTAGE))
        voltage_mv = raw * 0.01
        return round(voltage_mv, 4)

    def read_current(self):
        """
        Lee la corriente en amperios.
        """
        raw = self._to_signed(self._read_register(self.REG_CURRENT))
        current = raw * self.current_lsb
        return round(current, 4)

    def read_power(self):
        """
        Lee la potencia en vatios.
        """
        raw = self._read_register(self.REG_POWER)
        power = raw * self.power_lsb
        return round(power, 4)

    def read_all(self):
        """
        Lee todos los valores principales del sensor.
        """
        return {
            'voltage': self.read_bus_voltage(),
            'current': self.read_current(),
            'power': self.read_power(),
            'shunt_voltage': self.read_shunt_voltage()
        }


class SensorManager:
    """
    Administrador de multiples sensores INA219.
    """

    def __init__(self):
        self.i2c = I2C(
            0,
            scl=Pin(SENSORS_CONFIG['I2C_SCL']),
            sda=Pin(SENSORS_CONFIG['I2C_SDA']),
            freq=SENSORS_CONFIG['I2C_FREQ']
        )

        self.sensors = {}
        self.last_readings = {}
        self.error_counts = {}

        self._init_sensors()

    def _init_sensors(self):
        """
        Inicializa los sensores definidos en config.py.
        """
        print("🔧 Inicializando sensores INA219...")

        devices = self.i2c.scan()
        print("📡 Dispositivos I2C encontrados:", [hex(d) for d in devices])

        sensor_configs = [
            ('panel', SENSORS_CONFIG['INA219_PANEL']),
            ('battery', SENSORS_CONFIG['INA219_BATTERY']),
            ('load', SENSORS_CONFIG['INA219_LOAD'])
        ]

        for name, address in sensor_configs:
            if address in devices:
                try:
                    sensor = INA219(self.i2c, address)
                    self.sensors[name] = sensor
                    self.error_counts[name] = 0
                    print("✅ Sensor {} inicializado en 0x{:02X}".format(name, address))
                except Exception as e:
                    print("❌ Error al inicializar sensor {} (0x{:02X}): {}".format(name, address, e))
            else:
                print("⚠️ Sensor {} no encontrado en 0x{:02X}".format(name, address))

    def read_sensor(self, sensor_name, retries=3):
        """
        Lee un sensor especifico con reintentos.
        """
        if sensor_name not in self.sensors:
            return None

        sensor = self.sensors[sensor_name]

        for attempt in range(retries):
            try:
                data = sensor.read_all()
                self.last_readings[sensor_name] = data
                self.error_counts[sensor_name] = 0
                return data

            except Exception as e:
                self.error_counts[sensor_name] = self.error_counts.get(sensor_name, 0) + 1

                if attempt < retries - 1:
                    if SYSTEM_CONFIG['DEBUG']:
                        print("⚠️ Error leyendo {} (intento {}): {}".format(
                            sensor_name, attempt + 1, e
                        ))
                    time.sleep_ms(50)
                else:
                    print("❌ Error persistente leyendo {}: {}".format(sensor_name, e))

                    if sensor_name in self.last_readings:
                        print("📚 Usando ultima lectura valida para {}".format(sensor_name))
                        return self.last_readings[sensor_name]

        return None

    def read_all_sensors(self):
        """
        Lee todos los sensores disponibles y devuelve los datos procesados.
        """
        readings = {}

        for sensor_name in self.sensors.keys():
            data = self.read_sensor(sensor_name)
            if data:
                readings[sensor_name] = data

        return self._process_readings(readings)

    def _process_readings(self, raw_readings):
        """
        Procesa las lecturas crudas en un formato uniforme.
        """
        processed = {
            'panel_voltage': 0.0,
            'panel_current': 0.0,
            'battery_voltage': 0.0,
            'battery_current': 0.0,
            'load_current': 0.0,
            'power': 0.0,
            'timestamp': int(time.time()),
            'sensors_status': {}
        }

        if 'panel' in raw_readings:
            panel = raw_readings['panel']
            processed['panel_voltage'] = max(0, panel['voltage'])
            processed['panel_current'] = max(0, panel['current'])

        if 'battery' in raw_readings:
            battery = raw_readings['battery']
            processed['battery_voltage'] = max(0, battery['voltage'])
            processed['battery_current'] = battery['current']

        if 'load' in raw_readings:
            load = raw_readings['load']
            processed['load_current'] = max(0, load['current'])

        processed['power'] = round(
            processed['panel_voltage'] * processed['panel_current'],
            4
        )

        for sensor_name in ['panel', 'battery', 'load']:
            processed['sensors_status'][sensor_name] = {
                'connected': sensor_name in raw_readings,
                'errors': self.error_counts.get(sensor_name, 0)
            }

        return processed

    def get_sensor_status(self):
        """
        Devuelve el estado general de los sensores.
        """
        return {
            'total_sensors': len(self.sensors),
            'active_sensors': len([
                s for s in self.sensors.keys()
                if self.error_counts.get(s, 0) < 5
            ]),
            'i2c_devices': self.i2c.scan(),
            'error_counts': self.error_counts.copy()
        }


# Instancia global del manager de sensores
sensor_manager = SensorManager()
