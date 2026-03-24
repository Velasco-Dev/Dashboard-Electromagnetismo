# Sistema IoT Fotovoltaico ESP32 - Archivo Principal
# Coordina WiFi, MQTT y sensores para envio de datos en tiempo real

import time
import machine
import gc
from config import SYSTEM_CONFIG
from wifi import wifi_manager
from mqtt_client import mqtt_manager
from ina219 import sensor_manager


class SolarIoTSystem:
    """
    Clase principal del sistema IoT fotovoltaico
    """

    def __init__(self):
        self.is_running = False
        self.last_measurement = 0
        self.measurement_count = 0
        self.error_count = 0

        try:
            self.wdt = machine.WDT(timeout=SYSTEM_CONFIG['WATCHDOG_TIMEOUT'] * 1000)
            print("✅ Watchdog configurado")
        except:
            self.wdt = None
            print("⚠️ Watchdog no disponible")

        print("🚀 Sistema IoT Fotovoltaico inicializado")

    def start(self):
        """
        Inicia el sistema completo
        """
        print("=" * 50)
        print("🌞 SISTEMA IOT FOTOVOLTAICO ESP32")
        print("=" * 50)

        self._show_system_info()

        if not self._initialize_components():
            print("❌ Error en la inicializacion. Reiniciando en 10 segundos...")
            time.sleep(10)
            machine.reset()
            return

        print("✅ Sistema iniciado exitosamente")
        print("📊 Comenzando medicion cada {} segundos".format(
            SYSTEM_CONFIG['MEASUREMENT_INTERVAL']
        ))
        print("🛑 Para detener: main.system.stop()")
        print("-" * 50)

        self.is_running = True
        self._main_loop()

    def stop(self):
        """
        Detiene el sistema manualmente
        """
        print("🛑 Solicitud de parada recibida...")
        self._shutdown()

    def _show_system_info(self):
        """
        Muestra informacion del sistema
        """
        print("📱 Informacion del Sistema:")
        print("   • Chip ID: {}".format(machine.unique_id()))
        print("   • Frecuencia CPU: {} Hz".format(machine.freq()))
        print("   • Memoria libre: {} bytes".format(gc.mem_free()))
        print("   • Intervalo medicion: {}s".format(SYSTEM_CONFIG['MEASUREMENT_INTERVAL']))
        print("   • Debug habilitado: {}".format(SYSTEM_CONFIG['DEBUG']))
        print()

    def _initialize_components(self):
        """
        Inicializa todos los componentes del sistema
        """
        print("🔧 Inicializando componentes...")

        print("\n1️⃣ Conectando WiFi...")
        if not wifi_manager.connect():
            print("❌ Error: No se pudo conectar a WiFi")
            return False

        net_info = wifi_manager.get_connection_info()
        if net_info:
            print("   📶 Red: {}".format(net_info.get('ssid', 'N/A')))
            print("   📍 IP: {}".format(net_info.get('ip', 'N/A')))
            print("   📡 Señal: {} dBm".format(net_info.get('rssi', 'N/A')))

        print("\n2️⃣ Conectando MQTT...")
        if not mqtt_manager.connect():
            print("❌ Error: No se pudo conectar a MQTT")
            return False

        print("\n3️⃣ Verificando sensores...")
        sensor_status = sensor_manager.get_sensor_status()
        print("   📊 Sensores activos: {}/{}".format(
            sensor_status['active_sensors'],
            sensor_status['total_sensors']
        ))

        if sensor_status['active_sensors'] == 0:
            print("⚠️ No hay sensores INA219 activos")
        else:
            print("✅ Sensores detectados correctamente")

        print("\n4️⃣ Enviando mensaje de inicio...")
        startup_message = {
            'event': 'system_startup',
            'timestamp': int(time.time()),
            'system_info': {
                'chip_id': str(machine.unique_id()),
                'cpu_freq': machine.freq(),
                'free_memory': gc.mem_free(),
                'sensors': sensor_status
            },
            'network_info': net_info
        }

        mqtt_manager.publish('solar/events', startup_message)
        return True

    def _main_loop(self):
        """
        Bucle principal del sistema
        """
        while self.is_running:
            try:
                current_time = time.time()

                if self.wdt:
                    self.wdt.feed()

                self._check_connections()

                if current_time - self.last_measurement >= SYSTEM_CONFIG['MEASUREMENT_INTERVAL']:
                    self._perform_measurement()
                    self.last_measurement = current_time

                time.sleep(0.1)

            except KeyboardInterrupt:
                print("\n🛑 Interrupcion manual detectada")
                self._shutdown()
                break

            except Exception as e:
                self.error_count += 1
                print("❌ Error en bucle principal: {}".format(e))

                if self.error_count > 10:
                    print("❌ Demasiados errores consecutivos. Reiniciando...")
                    machine.reset()

                time.sleep(5)

    def _check_connections(self):
        """
        Verifica y mantiene las conexiones
        """
        if not wifi_manager.check_connection():
            print("⚠️ WiFi desconectado, intentando reconectar...")
            wifi_manager.reconnect()

        if not mqtt_manager.check_connection():
            print("⚠️ MQTT desconectado, intentando reconectar...")
            mqtt_manager.reconnect()

    def _perform_measurement(self):
        """
        Realiza una medicion completa y envia datos
        """
        try:
            sensor_data = sensor_manager.read_all_sensors()

            # Si no hay sensores reales, no envia nada
            if not sensor_data:
                print("⚠️ No se pudieron leer datos de sensores")
                return

            # Si el manager devuelve todo en cero y no hay sensores conectados, tampoco envia
            status = sensor_data.get('sensors_status', {})
            hay_sensor_real = False

            for key in status:
                if isinstance(status[key], dict) and status[key].get('connected'):
                    hay_sensor_real = True
                    break

            if not hay_sensor_real:
                print("⚠️ No hay sensores conectados, esperando lecturas reales...")
                return

            sensor_data['measurement_id'] = self.measurement_count
            sensor_data['system_uptime'] = time.time()
            sensor_data['error_count'] = self.error_count

            if SYSTEM_CONFIG['DEBUG']:
                self._print_measurement(sensor_data)

            success = mqtt_manager.publish_data(sensor_data)

            if success:
                self.measurement_count += 1
                self.error_count = 0

                led = machine.Pin(SYSTEM_CONFIG['LED_PIN'], machine.Pin.OUT)
                for _ in range(2):
                    led.off()
                    time.sleep_ms(50)
                    led.on()
                    time.sleep_ms(50)
            else:
                self.error_count += 1
                print("⚠️ Error al enviar datos (#{} )".format(self.error_count))

            if self.measurement_count % 10 == 0:
                gc.collect()

        except Exception as e:
            print("❌ Error en medicion: {}".format(e))
            self.error_count += 1

    def _print_measurement(self, data):
        """
        Imprime los datos de medicion de forma legible
        """
        print("\n📊 Medicion #{} - {}".format(
            self.measurement_count,
            time.localtime()
        ))
        print("   🌞 Panel:   {}V / {}A".format(
            data.get('panel_voltage', 0),
            data.get('panel_current', 0)
        ))
        print("   🔋 Bateria: {}V / {}A".format(
            data.get('battery_voltage', 0),
            data.get('battery_current', 0)
        ))
        print("   ⚡ Potencia: {}W".format(data.get('power', 0)))
        print("   📡 Estado:  {}".format(
            'MQTT OK' if mqtt_manager.is_connected else 'MQTT ERROR'
        ))

    def _shutdown(self):
        """
        Apaga el sistema de forma ordenada
        """
        print("\n🔄 Cerrando sistema...")

        self.is_running = False

        if mqtt_manager.is_connected:
            shutdown_message = {
                'event': 'system_shutdown',
                'timestamp': int(time.time()),
                'measurements_sent': self.measurement_count,
                'total_errors': self.error_count,
                'uptime': time.time()
            }
            mqtt_manager.publish('solar/events', shutdown_message)
            time.sleep(1)

        mqtt_manager.disconnect()
        wifi_manager.disconnect()

        print("✅ Sistema apagado correctamente")


system = None

def main():
    global system
    try:
        system = SolarIoTSystem()
        system.start()
    except Exception as e:
        print("❌ Error critico en main(): {}".format(e))
        print("🔄 Reiniciando ESP32 en 5 segundos...")
        time.sleep(5)
        machine.reset()