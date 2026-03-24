import time
import machine
import gc
import _thread

from config import SYSTEM_CONFIG
from wifi import wifi_manager
from mqtt_client import mqtt_manager
from ina219 import sensor_manager


class SolarIoTSystem:
    def __init__(self):
        self.is_running = False
        self.thread_started = False
        self.last_measurement = 0
        self.measurement_count = 0
        self.error_count = 0

        try:
            self.wdt = machine.WDT(timeout=SYSTEM_CONFIG['WATCHDOG_TIMEOUT'] * 1000)
            print("Watchdog configurado")
        except Exception:
            self.wdt = None
            print("Watchdog no disponible")

        print("Sistema IoT Fotovoltaico inicializado")

    def show_info(self):
        print("=" * 50)
        print("SISTEMA IOT FOTOVOLTAICO ESP32")
        print("=" * 50)
        print("Chip ID:", machine.unique_id())
        print("Frecuencia CPU:", machine.freq())
        print("Memoria libre:", gc.mem_free())
        print("Intervalo:", SYSTEM_CONFIG['MEASUREMENT_INTERVAL'])
        print("Debug:", SYSTEM_CONFIG['DEBUG'])
        print()

    def connect_wifi(self):
        print("Conectando WiFi...")
        ok = wifi_manager.connect()
        if ok:
            info = wifi_manager.get_connection_info()
            print("WiFi conectado")
            if info:
                print("SSID:", info.get("ssid"))
                print("IP:", info.get("ip"))
                print("RSSI:", info.get("rssi"))
        else:
            print("No se pudo conectar a WiFi")
        return ok

    def connect_mqtt(self):
        print("Conectando MQTT...")
        ok = mqtt_manager.connect()
        if ok:
            print("MQTT conectado")
        else:
            print("No se pudo conectar a MQTT")
        return ok

    def check_sensors(self):
        print("Verificando sensores I2C...")
        status = sensor_manager.get_sensor_status()
        print("Total sensores:", status.get("total_sensors"))
        print("Sensores activos:", status.get("active_sensors"))
        print("Dispositivos I2C:", [hex(x) for x in status.get("i2c_devices", [])])
        print("Errores:", status.get("error_counts"))
        return status

    def measure_once(self):
        try:
            data = sensor_manager.read_all_sensors()

            if not data:
                print("No se pudieron leer datos")
                return None

            sensor_status = data.get("sensors_status", {})
            hay_sensor_real = False

            for key in sensor_status:
                item = sensor_status[key]
                if isinstance(item, dict) and item.get("connected"):
                    hay_sensor_real = True
                    break

            if not hay_sensor_real:
                print("No hay sensores conectados, no se genera medicion real")
                return None

            data["measurement_id"] = self.measurement_count
            data["system_uptime"] = time.time()
            data["error_count"] = self.error_count

            print("Medicion:", data)
            return data

        except Exception as e:
            self.error_count += 1
            print("Error en medicion:", e)
            return None

    def publish_once(self):
        data = self.measure_once()
        if not data:
            print("Nada para publicar")
            return False

        ok = mqtt_manager.publish_data(data)
        if ok:
            self.measurement_count += 1
            print("Dato publicado")
            return True

        self.error_count += 1
        print("No se pudo publicar")
        return False

    def start_loop(self):
        if self.is_running:
            print("El loop ya esta en ejecucion")
            return False

        self.is_running = True
        self.last_measurement = 0

        try:
            _thread.start_new_thread(self._loop, ())
            self.thread_started = True
            print("Loop iniciado en segundo plano")
            print("Para detener: control.stop()")
            return True
        except Exception as e:
            self.is_running = False
            print("No se pudo iniciar el hilo:", e)
            return False

    def _loop(self):
        while self.is_running:
            try:
                current_time = time.time()

                if self.wdt:
                    self.wdt.feed()

                self._check_connections()

                if current_time - self.last_measurement >= SYSTEM_CONFIG['MEASUREMENT_INTERVAL']:
                    data = self.measure_once()
                    if data:
                        ok = mqtt_manager.publish_data(data)
                        if ok:
                            self.measurement_count += 1
                            self.error_count = 0
                        else:
                            self.error_count += 1

                    self.last_measurement = current_time

                time.sleep(0.1)

            except Exception as e:
                self.error_count += 1
                print("Error en loop:", e)
                time.sleep(1)

        print("Loop detenido")

    def stop(self):
        print("Deteniendo sistema...")
        self.is_running = False
        time.sleep(0.5)
        mqtt_manager.disconnect()
        wifi_manager.disconnect()
        print("Sistema detenido")

    def _check_connections(self):
        try:
            if not wifi_manager.check_connection():
                print("WiFi desconectado, reconectando...")
                wifi_manager.reconnect()
        except Exception as e:
            print("Error verificando WiFi:", e)

        try:
            if not mqtt_manager.check_connection():
                print("MQTT desconectado, reconectando...")
                mqtt_manager.reconnect()
        except Exception as e:
            print("Error verificando MQTT:", e)


system = None


def init():
    global system
    if system is None:
        system = SolarIoTSystem()
    return system


def start():
    global system
    if system is None:
        system = SolarIoTSystem()

    if not system.connect_wifi():
        return False

    if not system.connect_mqtt():
        return False

    system.check_sensors()
    return system.start_loop()


def stop():
    global system
    if system is not None:
        system.stop()
    else:
        print("No hay sistema iniciado")


def info():
    global system
    if system is not None:
        system.show_info()
    else:
        print("No hay sistema iniciado")


def sensors():
    global system
    if system is not None:
        return system.check_sensors()
    else:
        print("No hay sistema iniciado")
        return None


def measure():
    global system
    if system is not None:
        return system.measure_once()
    else:
        print("No hay sistema iniciado")
        return None


def publish():
    global system
    if system is not None:
        return system.publish_once()
    else:
        print("No hay sistema iniciado")
        return False


def help_commands():
    print()
    print("Comandos disponibles:")
    print("import control")
    print("control.init()    -> crea el sistema")
    print("control.start()   -> conecta WiFi, MQTT e inicia envio continuo")
    print("control.stop()    -> detiene el sistema")
    print("control.info()    -> muestra informacion del ESP32")
    print("control.sensors() -> revisa sensores I2C")
    print("control.measure() -> hace una medicion")
    print("control.publish() -> mide y publica una vez")
    print()
