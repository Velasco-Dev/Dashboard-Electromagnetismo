# Módulo WiFi para ESP32 - Sistema IoT Fotovoltaico
# Maneja la conexión WiFi con reconexión automática
# @author Sistema IoT Fotovoltaico

import network
import time
import machine
from config import WIFI_CONFIG, SYSTEM_CONFIG

class WiFiManager:
    def __init__(self):
        self.wlan = network.WLAN(network.STA_IF)
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        
        # LED para indicar estado
        self.led = machine.Pin(SYSTEM_CONFIG['LED_PIN'], machine.Pin.OUT)
    
    def connect(self):
        """
        Conecta a la red WiFi configurada
        """
        print("📶 Iniciando conexión WiFi...")
        
        # Activar interfaz WiFi
        self.wlan.active(True)
        
        if not self.wlan.isconnected():
            print(f"🔄 Conectando a {WIFI_CONFIG['SSID']}...")
            
            # Conectar a la red
            self.wlan.connect(WIFI_CONFIG['SSID'], WIFI_CONFIG['PASSWORD'])
            
            # Esperar conexión con timeout
            timeout = WIFI_CONFIG['TIMEOUT']
            while not self.wlan.isconnected() and timeout > 0:
                # Parpadear LED mientras conecta
                self.led.on()
                time.sleep(0.1)
                self.led.off()
                time.sleep(0.4)
                timeout -= 0.5
                
                print(".", end="")
            
            print()  # Nueva línea después de los puntos
        
        if self.wlan.isconnected():
            self.is_connected = True
            self.reconnect_attempts = 0
            
            # Obtener configuración de red
            config = self.wlan.ifconfig()
            
            print("✅ WiFi conectado exitosamente!")
            print(f"   📍 IP: {config[0]}")
            print(f"   🌐 Gateway: {config[2]}")
            print(f"   🔧 DNS: {config[3]}")
            print(f"   📡 RSSI: {self.get_signal_strength()} dBm")
            
            # LED encendido indica conexión exitosa
            self.led.on()
            
            return True
        else:
            self.is_connected = False
            print(f"❌ Error: No se pudo conectar a {WIFI_CONFIG['SSID']}")
            self.led.off()
            return False
    
    def disconnect(self):
        """
        Desconecta de la red WiFi
        """
        if self.wlan.isconnected():
            print("🔌 Desconectando WiFi...")
            self.wlan.disconnect()
            self.is_connected = False
            self.led.off()
            time.sleep(1)
    
    def check_connection(self):
        """
        Verifica el estado de la conexión WiFi
        """
        connected = self.wlan.isconnected()
        
        if connected != self.is_connected:
            if connected:
                print("✅ WiFi reconectado")
                self.is_connected = True
                self.reconnect_attempts = 0
                self.led.on()
            else:
                print("⚠️ WiFi desconectado")
                self.is_connected = False
                self.led.off()
        
        return connected
    
    def reconnect(self):
        """
        Intenta reconectar automáticamente
        """
        if not self.check_connection() and self.reconnect_attempts < self.max_reconnect_attempts:
            self.reconnect_attempts += 1
            print(f"🔄 Reintentando conexión WiFi... ({self.reconnect_attempts}/{self.max_reconnect_attempts})")
            
            # Reiniciar interfaz WiFi
            self.wlan.active(False)
            time.sleep(2)
            self.wlan.active(True)
            time.sleep(1)
            
            # Intentar conectar
            success = self.connect()
            
            if not success:
                if self.reconnect_attempts >= self.max_reconnect_attempts:
                    print("❌ Máximo número de intentos de reconexión alcanzado")
                    print("🔄 Reiniciando ESP32 en 10 segundos...")
                    
                    # Parpadear LED rápido para indicar error crítico
                    for _ in range(20):
                        self.led.on()
                        time.sleep(0.1)
                        self.led.off()
                        time.sleep(0.1)
                    
                    machine.reset()
            
            return success
        
        return self.is_connected
    
    def get_signal_strength(self):
        """
        Obtiene la intensidad de la señal WiFi
        """
        try:
            return self.wlan.status('rssi') if self.wlan.isconnected() else -999
        except:
            return -999
    
    def get_connection_info(self):
        """
        Obtiene información detallada de la conexión
        """
        if not self.wlan.isconnected():
            return None
        
        config = self.wlan.ifconfig()
        
        return {
            'ip': config[0],
            'subnet': config[1],
            'gateway': config[2],
            'dns': config[3],
            'rssi': self.get_signal_strength(),
            'ssid': WIFI_CONFIG['SSID'],
            'mac': self.get_mac_address(),
            'connected': True
        }
    
    def get_mac_address(self):
        """
        Obtiene la dirección MAC del ESP32
        """
        try:
            import ubinascii
            mac = ubinascii.hexlify(self.wlan.config('mac')).decode()
            return ':'.join(mac[i:i+2] for i in range(0, len(mac), 2))
        except:
            return "00:00:00:00:00:00"
    
    def scan_networks(self):
        """
        Escanea redes WiFi disponibles
        """
        print("🔍 Escaneando redes WiFi...")
        
        networks = self.wlan.scan()
        
        print(f"📡 Encontradas {len(networks)} redes:")
        for ssid, bssid, channel, rssi, authmode, hidden in networks:
            ssid_str = ssid.decode('utf-8') if ssid else "[Hidden]"
            auth_str = ["Open", "WEP", "WPA-PSK", "WPA2-PSK", "WPA/WPA2-PSK"][authmode]
            print(f"   📶 {ssid_str:20} | Ch:{channel:2} | {rssi:4}dBm | {auth_str}")
        
        return networks

# Instancia global del manager WiFi
wifi_manager = WiFiManager()