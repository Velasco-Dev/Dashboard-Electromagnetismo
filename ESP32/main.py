# Sistema IoT Fotovoltaico ESP32 - Archivo Principal
# Coordina WiFi, MQTT y sensores para envio de datos en tiempo real
# @author Sistema IoT Fotovoltaico

import time
import machine
import gc
import json
from config import SYSTEM_CONFIG, MQTT_CONFIG
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
        
        # Configurar watchdog si esta disponible
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
        
        # Mostrar informacion del sistema
        self._show_system_info()
        
        # Inicializar componentes
        if not self._initialize_components():
            print("❌ Error en la inicializacion. Reiniciando en 10 segundos...")
            time.sleep(10)
            machine.reset()
            return
        
        print("✅ Sistema iniciado exitosamente")
        print("📊 Comenzando envio de datos cada {} segundos".format(SYSTEM_CONFIG['MEASUREMENT_INTERVAL']))
        print("-" * 50)
        
        # Bucle principal
        self.is_running = True
        self._main_loop()
    
    def _show_system_info(self):
        """
        Muestra informacion del sistema
        """
        print("📱 Informacion del Sistema:")
        print(f"   • Chip ID: {machine.unique_id()}")
        print(f"   • Frecuencia CPU: {machine.freq()} Hz")
        print(f"   • Memoria libre: {gc.mem_free()} bytes")
        print(f"   • Intervalo medicion: {SYSTEM_CONFIG['MEASUREMENT_INTERVAL']}s")
        print(f"   • Debug habilitado: {SYSTEM_CONFIG['DEBUG']}")
        print()
    
    def _initialize_components(self):
        """
        Inicializa todos los componentes del sistema
        """
        print("🔧 Inicializando componentes...")
        
        # 1. Conectar WiFi
        print("\n1️⃣ Conectando WiFi...")
        if not wifi_manager.connect():
            print("❌ Error: No se pudo conectar a WiFi")
            return False
        
        # 2. Mostrar informacion de red
        net_info = wifi_manager.get_connection_info()
        if net_info:
            print(f"   📶 Red: {net_info['ssid']}")
            print(f"   📍 IP: {net_info['ip']}")
            print(f"   📡 Señal: {net_info['rssi']} dBm")
        
        # 3. Conectar MQTT
        print("\n2️⃣ Conectando MQTT...")
        if not mqtt_manager.connect():
            print("❌ Error: No se pudo conectar a MQTT")
            return False
        
        # 4. Verificar sensores
        print("\n3️⃣ Verificando sensores...")
        sensor_status = sensor_manager.get_sensor_status()
        print(f"   📊 Sensores activos: {sensor_status['active_sensors']}/{sensor_status['total_sensors']}")
        
        if sensor_status['active_sensors'] == 0:
            print("⚠️ Advertencia: No hay sensores activos, usando datos simulados")
        
        # 5. Enviar mensaje de inicio
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
                
                # Alimentar watchdog
                if self.wdt:
                    self.wdt.feed()
                
                # Verificar conexiones
                self._check_connections()
                
                # Realizar medicion si es tiempo
                if current_time - self.last_measurement >= SYSTEM_CONFIG['MEASUREMENT_INTERVAL']:
                    self._perform_measurement()
                    self.last_measurement = current_time
                
                # Pausa corta para no saturar la CPU
                time.sleep(0.1)
                
            except KeyboardInterrupt:
                print("\n🛑 Interrupcion manual detectada")
                self._shutdown()
                break
                
            except Exception as e:
                self.error_count += 1
                print(f"❌ Error en bucle principal: {e}")
                
                if self.error_count > 10:
                    print("❌ Demasiados errores consecutivos. Reiniciando...")
                    machine.reset()
                
                time.sleep(5)  # Pausa antes de continuar
    
    def _check_connections(self):
        """
        Verifica y mantiene las conexiones
        """
        # Verificar WiFi
        if not wifi_manager.check_connection():
            print("⚠️ WiFi desconectado, intentando reconectar...")
            wifi_manager.reconnect()
        
        # Verificar MQTT
        if not mqtt_manager.check_connection():
            print("⚠️ MQTT desconectado, intentando reconectar...")
            mqtt_manager.reconnect()
    
    def _perform_measurement(self):
        """
        Realiza una medicion completa y envia datos
        """
        try:
            # Leer sensores
            sensor_data = sensor_manager.read_all_sensors()
            
            if sensor_data:
                # Agregar metadatos
                sensor_data['measurement_id'] = self.measurement_count
                sensor_data['system_uptime'] = time.time()
                sensor_data['error_count'] = self.error_count
                
                # Mostrar datos si debug esta habilitado
                if SYSTEM_CONFIG['DEBUG']:
                    self._print_measurement(sensor_data)
                
                # Enviar via MQTT
                success = mqtt_manager.publish_data(sensor_data)
                
                if success:
                    self.measurement_count += 1
                    self.error_count = 0  # Reset contador de errores
                    
                    # LED parpadeo rapido para indicar envio exitoso
                    led = machine.Pin(SYSTEM_CONFIG['LED_PIN'], machine.Pin.OUT)
                    for _ in range(2):
                        led.off()
                        time.sleep_ms(50)
                        led.on()
                        time.sleep_ms(50)
                else:
                    self.error_count += 1
                    print(f"⚠️ Error al enviar datos (#{self.error_count})")
            
            else:
                print("⚠️ No se pudieron leer datos de sensores")
                # Usar datos simulados como fallback
                simulated_data = self._generate_fallback_data()
                mqtt_manager.publish_data(simulated_data)
            
            # Recoleccion de basura periodica
            if self.measurement_count % 10 == 0:
                gc.collect()
                
        except Exception as e:
            print(f"❌ Error en medicion: {e}")
            self.error_count += 1
    
    def _generate_fallback_data(self):
        """
        Genera datos simulados cuando los sensores no estan disponibles
        """
        import math
        
        # Simular datos basicos basados en tiempo
        t = time.time() / 60  # Minutos desde epoch
        
        return {
            'panel_voltage': 12.5 + 5 * math.sin(t / 60),  # Varia con el tiempo
            'panel_current': max(0, 1.5 + math.sin(t / 30)),
            'battery_voltage': 12.1 + 0.5 * math.sin(t / 120),
            'battery_current': -0.8 + 0.3 * math.sin(t / 45),
            'power': 15.0 + 8 * math.sin(t / 60),
            'timestamp': int(time.time()),
            'mode': 'fallback',
            'sensors_status': {'simulated': True}
        }
    
    def _print_measurement(self, data):
        """
        Imprime los datos de medicion de forma legible
        """
        print("\n📊 Medicion #{} - {}".format(
            self.measurement_count, 
            time.localtime()
        ))
        print(f"   🌞 Panel:   {data['panel_voltage']}V / {data['panel_current']}A")
        print(f"   🔋 Bateria: {data['battery_voltage']}V / {data['battery_current']}A")
        print(f"   ⚡ Potencia: {data['power']}W")
        print(f"   📡 Estado:  {'MQTT OK' if mqtt_manager.is_connected else 'MQTT ERROR'}")
    
    def _shutdown(self):
        """
        Apaga el sistema de forma ordenada
        """
        print("\n🔄 Cerrando sistema...")
        
        self.is_running = False
        
        # Enviar mensaje de apagado
        if mqtt_manager.is_connected:
            shutdown_message = {
                'event': 'system_shutdown',
                'timestamp': int(time.time()),
                'measurements_sent': self.measurement_count,
                'total_errors': self.error_count,
                'uptime': time.time()
            }
            mqtt_manager.publish('solar/events', shutdown_message)
            time.sleep(1)  # Esperar envio
        
        # Desconectar servicios
        mqtt_manager.disconnect()
        wifi_manager.disconnect()
        
        print("✅ Sistema apagado correctamente")

def main():
    """
    Funcion principal de entrada
    """
    try:
        # Crear e iniciar sistema
        system = SolarIoTSystem()
        system.start()
        
    except Exception as e:
        print(f"❌ Error critico en main(): {e}")
        print("🔄 Reiniciando ESP32 en 5 segundos...")
        time.sleep(5)
        machine.reset()

# Punto de entrada
if __name__ == '__main__':
    main()
