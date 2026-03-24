# Modulo INA219 para ESP32 - Sistema IoT Fotovoltaico
# Maneja la lectura de sensores INA219 para panel, bateria y consumo
# @author Sistema IoT Fotovoltaico

import time
import machine
from machine import I2C, Pin
from config import SENSORS_CONFIG, SYSTEM_CONFIG

class INA219:
    """
    Driver basico para el sensor INA219
    Mide voltaje, corriente y potencia
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
        self.current_lsb = 0.0001  # 100uA por bit
        self.power_lsb = 0.002      # 2mW por bit
        
        # Configurar el sensor
        self._configure()
    
    def _configure(self):
        """
        Configura el sensor INA219
        """
        # Configuracion: 32V, ±320mV, 12-bit, 532µs
        config = 0x399F  # BRNG=1(32V), PG=1(±320mV), BADC=1100(12bit,532µs), SADC=1100(12bit,532µs), MODE=111(continuo)
        self._write_register(self.REG_CONFIG, config)
        
        # Calibracion para rango de corriente
        # Cal = trunc(0.04096 / (current_lsb * shunt_resistance))
        shunt_ohms = SENSORS_CONFIG['SHUNT_OHMS']
        calibration = int(0.04096 / (self.current_lsb * shunt_ohms))
        self._write_register(self.REG_CALIBRATION, calibration)
        
        time.sleep_ms(100)  # Esperar configuracion
    
    def _write_register(self, register, value):
        """
        Escribe un valor de 16 bits en un registro
        """
        data = [(value >> 8) & 0xFF, value & 0xFF]
        self.i2c.writeto_mem(self.address, register, bytes(data))
    
    def _read_register(self, register):
        """
        Lee un valor de 16 bits de un registro
        """
        data = self.i2c.readfrom_mem(self.address, register, 2)
        return (data[0] << 8) | data[1]
    
    def read_bus_voltage(self):
        """
        Lee el voltaje del bus (V+)
        """
        raw = self._read_register(self.REG_BUS_VOLTAGE)
        # El voltaje esta en los bits 15-3, LSB = 4mV
        voltage = (raw >> 3) * 0.004
        return round(voltage, 3)
    
    def read_shunt_voltage(self):
        """
        Lee el voltaje del shunt (mV)
        """
        raw = self._read_register(self.REG_SHUNT_VOLTAGE)
        # Convertir de complemento a 2 si es necesario
        if raw > 32767:
            raw -= 65536
        # LSB = 10µV
        voltage_mv = raw * 0.01
        return round(voltage_mv, 4)
    
    def read_current(self):
        """
        Lee la corriente (A)
        """
        raw = self._read_register(self.REG_CURRENT)
        # Convertir de complemento a 2 si es necesario
        if raw > 32767:
            raw -= 65536
        current = raw * self.current_lsb
        return round(current, 4)
    
    def read_power(self):
        """
        Lee la potencia (W)
        """
        raw = self._read_register(self.REG_POWER)
        power = raw * self.power_lsb
        return round(power, 4)
    
    def read_all(self):
        """
        Lee todos los valores del sensor
        """
        return {
            'voltage': self.read_bus_voltage(),
            'current': self.read_current(),
            'power': self.read_power(),
            'shunt_voltage': self.read_shunt_voltage()
        }

class SensorManager:
    """
    Administrador de multiples sensores INA219
    """
    
    def __init__(self):
        # Inicializar I2C
        self.i2c = I2C(
            0,
            scl=Pin(SENSORS_CONFIG['I2C_SCL']),
            sda=Pin(SENSORS_CONFIG['I2C_SDA']),
            freq=SENSORS_CONFIG['I2C_FREQ']
        )
        
        self.sensors = {}
        self.last_readings = {}
        self.error_counts = {}
        
        # Inicializar sensores
        self._init_sensors()
    
    def _init_sensors(self):
        """
        Inicializa los sensores INA219
        """
        print("Inicializando sensores INA219...")
        
        # Escanear dispositivos I2C
        devices = self.i2c.scan()
        print(f"Dispositivos I2C encontrados: {[hex(d) for d in devices]}")
        
        # Configurar sensores segun las direcciones encontradas
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
                    print(f"Sensor {name} inicializado en 0x{address:02X}")
                except Exception as e:
                    print(f"Error al inicializar sensor {name} (0x{address:02X}): {e}")
            else:
                print(f"Sensor {name} no encontrado en 0x{address:02X}")
    
    def read_sensor(self, sensor_name, retries=3):
        """
        Lee datos de un sensor especifico con reintentos
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
                self.error_counts[sensor_name] += 1
                
                if attempt < retries - 1:
                    if SYSTEM_CONFIG['DEBUG']:
                        print(f"Error leyendo {sensor_name} (intento {attempt + 1}): {e}")
                    time.sleep_ms(50)  # Breve pausa antes de reintentar
                else:
                    print(f"Error persistente leyendo {sensor_name}: {e}")
                    
                    # Usar ultima lectura valida si esta disponible
                    if sensor_name in self.last_readings:
                        print(f"Usando ultima lectura valida para {sensor_name}")
                        return self.last_readings[sensor_name]
        
        return None
    
    def read_all_sensors(self):
        """
        Lee todos los sensores y devuelve datos procesados
        """
        readings = {}
        
        # Leer cada sensor
        for sensor_name in self.sensors.keys():
            data = self.read_sensor(sensor_name)
            if data:
                readings[sensor_name] = data
        
        # Procesar y formatear datos
        return self._process_readings(readings)
    
    def _process_readings(self, raw_readings):
        """
        Procesa las lecturas brutas y calcula valores derivados
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
        
        # Procesar datos del panel
        if 'panel' in raw_readings:
            panel = raw_readings['panel']
            processed['panel_voltage'] = max(0, panel['voltage'])
            processed['panel_current'] = max(0, panel['current'])
        
        # Procesar datos de la bateria
        if 'battery' in raw_readings:
            battery = raw_readings['battery']
            processed['battery_voltage'] = max(0, battery['voltage'])
            processed['battery_current'] = battery['current']  # Puede ser negativa (carga)
        
        # Procesar datos del consumo
        if 'load' in raw_readings:
            load = raw_readings['load']
            processed['load_current'] = max(0, load['current'])
        
        # Calcular potencia total del panel
        processed['power'] = processed['panel_voltage'] * processed['panel_current']
        
        # Estado de sensores
        for sensor_name in ['panel', 'battery', 'load']:
            processed['sensors_status'][sensor_name] = {
                'connected': sensor_name in raw_readings,
                'errors': self.error_counts.get(sensor_name, 0)
            }
        
        return processed
    
    def get_sensor_status(self):
        """
        Obtiene el estado de todos los sensores
        """
        status = {
            'total_sensors': len(self.sensors),
            'active_sensors': len([s for s in self.sensors.keys() if self.error_counts.get(s, 0) < 5]),
            'i2c_devices': self.i2c.scan(),
            'error_counts': self.error_counts.copy()
        }
        
        return status

# Instancia global del manager de sensores
sensor_manager = SensorManager()\n\nclass SensorManager:\n    """\n    Administrador de múltiples sensores INA219\n    """\n    \n    def __init__(self):\n        # Inicializar I2C\n        self.i2c = I2C(\n            0,\n            scl=Pin(SENSORS_CONFIG['I2C_SCL']),\n            sda=Pin(SENSORS_CONFIG['I2C_SDA']),\n            freq=SENSORS_CONFIG['I2C_FREQ']\n        )\n        \n        self.sensors = {}\n        self.last_readings = {}\n        self.error_counts = {}\n        \n        # Inicializar sensores\n        self._init_sensors()\n    \n    def _init_sensors(self):\n        """\n        Inicializa los sensores INA219\n        """\n        print("🔧 Inicializando sensores INA219...")\n        \n        # Escanear dispositivos I2C\n        devices = self.i2c.scan()\n        print(f"📡 Dispositivos I2C encontrados: {[hex(d) for d in devices]}")\n        \n        # Configurar sensores según las direcciones encontradas\n        sensor_configs = [\n            ('panel', SENSORS_CONFIG['INA219_PANEL']),\n            ('battery', SENSORS_CONFIG['INA219_BATTERY']),\n            ('load', SENSORS_CONFIG['INA219_LOAD'])\n        ]\n        \n        for name, address in sensor_configs:\n            if address in devices:\n                try:\n                    sensor = INA219(self.i2c, address)\n                    self.sensors[name] = sensor\n                    self.error_counts[name] = 0\n                    print(f"✅ Sensor {name} inicializado en 0x{address:02X}")\n                except Exception as e:\n                    print(f"❌ Error al inicializar sensor {name} (0x{address:02X}): {e}")\n            else:\n                print(f"⚠️ Sensor {name} no encontrado en 0x{address:02X}")\n    \n    def read_sensor(self, sensor_name, retries=3):\n        """\n        Lee datos de un sensor específico con reintentos\n        """\n        if sensor_name not in self.sensors:\n            return None\n        \n        sensor = self.sensors[sensor_name]\n        \n        for attempt in range(retries):\n            try:\n                data = sensor.read_all()\n                self.last_readings[sensor_name] = data\n                self.error_counts[sensor_name] = 0\n                return data\n            \n            except Exception as e:\n                self.error_counts[sensor_name] += 1\n                \n                if attempt < retries - 1:\n                    if SYSTEM_CONFIG['DEBUG']:\n                        print(f"⚠️ Error leyendo {sensor_name} (intento {attempt + 1}): {e}")\n                    time.sleep_ms(50)  # Breve pausa antes de reintentar\n                else:\n                    print(f"❌ Error persistente leyendo {sensor_name}: {e}")\n                    \n                    # Usar última lectura válida si está disponible\n                    if sensor_name in self.last_readings:\n                        print(f"📚 Usando última lectura válida para {sensor_name}")\n                        return self.last_readings[sensor_name]\n        \n        return None\n    \n    def read_all_sensors(self):\n        """\n        Lee todos los sensores y devuelve datos procesados\n        """\n        readings = {}\n        \n        # Leer cada sensor\n        for sensor_name in self.sensors.keys():\n            data = self.read_sensor(sensor_name)\n            if data:\n                readings[sensor_name] = data\n        \n        # Procesar y formatear datos\n        return self._process_readings(readings)\n    \n    def _process_readings(self, raw_readings):\n        """\n        Procesa las lecturas brutas y calcula valores derivados\n        """\n        processed = {\n            'panel_voltage': 0.0,\n            'panel_current': 0.0,\n            'battery_voltage': 0.0,\n            'battery_current': 0.0,\n            'load_current': 0.0,\n            'power': 0.0,\n            'timestamp': int(time.time()),\n            'sensors_status': {}\n        }\n        \n        # Procesar datos del panel\n        if 'panel' in raw_readings:\n            panel = raw_readings['panel']\n            processed['panel_voltage'] = max(0, panel['voltage'])\n            processed['panel_current'] = max(0, panel['current'])\n        \n        # Procesar datos de la batería\n        if 'battery' in raw_readings:\n            battery = raw_readings['battery']\n            processed['battery_voltage'] = max(0, battery['voltage'])\n            processed['battery_current'] = battery['current']  # Puede ser negativa (carga)\n        \n        # Procesar datos del consumo\n        if 'load' in raw_readings:\n            load = raw_readings['load']\n            processed['load_current'] = max(0, load['current'])\n        \n        # Calcular potencia total del panel\n        processed['power'] = processed['panel_voltage'] * processed['panel_current']\n        \n        # Estado de sensores\n        for sensor_name in ['panel', 'battery', 'load']:\n            processed['sensors_status'][sensor_name] = {\n                'connected': sensor_name in raw_readings,\n                'errors': self.error_counts.get(sensor_name, 0)\n            }\n        \n        return processed\n    \n    def get_sensor_status(self):\n        """\n        Obtiene el estado de todos los sensores\n        """\n        status = {\n            'total_sensors': len(self.sensors),\n            'active_sensors': len([s for s in self.sensors.keys() if self.error_counts.get(s, 0) < 5]),\n            'i2c_devices': self.i2c.scan(),\n            'error_counts': self.error_counts.copy()\n        }\n        \n        return status\n\n# Instancia global del manager de sensores\nsensor_manager = SensorManager()