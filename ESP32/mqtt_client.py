# Módulo MQTT Client para ESP32 - Sistema IoT Fotovoltaico
# Maneja la conexión y comunicación MQTT con reconexión automática
# @author Sistema IoT Fotovoltaico

import time
import machine
import json
from umqtt.simple import MQTTClient
from config import MQTT_CONFIG, SYSTEM_CONFIG

class MQTTManager:
    def __init__(self):
        self.client = None
        self.is_connected = False
        self.last_ping = 0
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        
        # Callback para mensajes recibidos
        self.message_callback = None
        
        # Generar client ID único si no está especificado
        if not MQTT_CONFIG['CLIENT_ID'] or MQTT_CONFIG['CLIENT_ID'] == 'esp32_solar_001':
            import ubinascii
            mac = ubinascii.hexlify(machine.unique_id()).decode()
            MQTT_CONFIG['CLIENT_ID'] = f"esp32_solar_{mac[-6:]}"
    
    def connect(self):
        """
        Conecta al broker MQTT
        """
        try:
            print(f"🔌 Conectando a broker MQTT: {MQTT_CONFIG['BROKER']}:{MQTT_CONFIG['PORT']}")
            print(f"📱 Client ID: {MQTT_CONFIG['CLIENT_ID']}")
            
            # Crear cliente MQTT
            self.client = MQTTClient(
                client_id=MQTT_CONFIG['CLIENT_ID'],
                server=MQTT_CONFIG['BROKER'],
                port=MQTT_CONFIG['PORT'],
                keepalive=MQTT_CONFIG['KEEPALIVE']
            )
            
            # Configurar mensaje de última voluntad (Last Will)
            last_will = {\n                'client': MQTT_CONFIG['CLIENT_ID'],\n                'status': 'offline',\n                'timestamp': int(time.time()),\n                'reason': 'disconnected'\n            }\n            \n            self.client.set_last_will(\n                MQTT_CONFIG['TOPIC_STATUS'], \n                json.dumps(last_will)\n            )\n            \n            # Conectar\n            self.client.connect()\n            \n            # Configurar callback para mensajes\n            if self.message_callback:\n                self.client.set_callback(self.message_callback)\n            \n            self.is_connected = True\n            self.reconnect_attempts = 0\n            self.last_ping = time.time()\n            \n            print("✅ Conectado al broker MQTT exitosamente!")\n            \n            # Publicar estado online\n            self.publish_status('online')\n            \n            return True\n            \n        except Exception as e:\n            print(f"❌ Error al conectar MQTT: {e}")\n            self.is_connected = False\n            return False\n    \n    def disconnect(self):\n        """\n        Desconecta del broker MQTT\n        """\n        if self.client and self.is_connected:\n            try:\n                print("🔌 Desconectando del broker MQTT...")\n                \n                # Publicar estado offline antes de desconectar\n                self.publish_status('offline', 'manual_disconnect')\n                \n                self.client.disconnect()\n                \n            except Exception as e:\n                print(f"⚠️ Error al desconectar MQTT: {e}")\n            \n            finally:\n                self.is_connected = False\n                self.client = None\n                print("✅ Desconectado del broker MQTT")\n    \n    def publish(self, topic, data, retain=False):\n        """\n        Publica datos en un topic MQTT\n        """\n        if not self.is_connected or not self.client:\n            print("⚠️ No conectado a MQTT, no se puede publicar")\n            return False\n        \n        try:\n            # Convertir datos a JSON si es necesario\n            if isinstance(data, dict):\n                message = json.dumps(data)\n            else:\n                message = str(data)\n            \n            # Publicar mensaje\n            self.client.publish(topic, message, retain=retain)\n            \n            if SYSTEM_CONFIG['DEBUG']:\n                print(f"📤 Publicado en {topic}: {message[:100]}...")\n            \n            return True\n            \n        except Exception as e:\n            print(f"❌ Error al publicar en {topic}: {e}")\n            self.is_connected = False\n            return False\n    \n    def publish_data(self, sensor_data):\n        """\n        Publica datos de sensores en el topic principal\n        """\n        return self.publish(MQTT_CONFIG['TOPIC_DATA'], sensor_data)\n    \n    def publish_status(self, status, reason='normal'):\n        """\n        Publica el estado del sistema\n        """\n        status_data = {\n            'client': MQTT_CONFIG['CLIENT_ID'],\n            'status': status,\n            'timestamp': int(time.time()),\n            'reason': reason,\n            'uptime': time.time(),\n            'free_memory': self.get_free_memory()\n        }\n        \n        return self.publish(MQTT_CONFIG['TOPIC_STATUS'], status_data, retain=True)\n    \n    def check_connection(self):\n        """\n        Verifica y mantiene la conexión MQTT\n        """\n        if not self.is_connected or not self.client:\n            return False\n        \n        try:\n            # Verificar conexión con ping periódico\n            current_time = time.time()\n            \n            if current_time - self.last_ping > MQTT_CONFIG['KEEPALIVE'] / 2:\n                # Procesar mensajes pendientes (funciona como ping)\n                self.client.check_msg()\n                self.last_ping = current_time\n            \n            return True\n            \n        except Exception as e:\n            print(f"⚠️ Conexión MQTT perdida: {e}")\n            self.is_connected = False\n            return False\n    \n    def reconnect(self):\n        """\n        Intenta reconectar automáticamente\n        """\n        if self.is_connected:\n            return True\n        \n        if self.reconnect_attempts >= self.max_reconnect_attempts:\n            print("❌ Máximo número de intentos de reconexión MQTT alcanzado")\n            return False\n        \n        self.reconnect_attempts += 1\n        print(f"🔄 Reintentando conexión MQTT... ({self.reconnect_attempts}/{self.max_reconnect_attempts})")\n        \n        # Limpiar cliente anterior\n        if self.client:\n            try:\n                self.client.disconnect()\n            except:\n                pass\n            self.client = None\n        \n        # Esperar antes de reconectar\n        time.sleep(MQTT_CONFIG['RECONNECT_DELAY'])\n        \n        # Intentar reconectar\n        success = self.connect()\n        \n        if not success:\n            print(f"⚠️ Fallo al reconectar MQTT (intento {self.reconnect_attempts})")\n        \n        return success\n    \n    def set_callback(self, callback):\n        """\n        Configura callback para mensajes recibidos\n        """\n        self.message_callback = callback\n        if self.client:\n            self.client.set_callback(callback)\n    \n    def subscribe(self, topic):\n        """\n        Se suscribe a un topic\n        """\n        if not self.is_connected or not self.client:\n            print("⚠️ No conectado a MQTT, no se puede suscribir")\n            return False\n        \n        try:\n            self.client.subscribe(topic)\n            print(f"✅ Suscrito a topic: {topic}")\n            return True\n        except Exception as e:\n            print(f"❌ Error al suscribirse a {topic}: {e}")\n            return False\n    \n    def get_free_memory(self):\n        """\n        Obtiene la memoria libre disponible\n        """\n        try:\n            import gc\n            gc.collect()\n            return gc.mem_free()\n        except:\n            return -1\n    \n    def get_connection_status(self):\n        """\n        Obtiene el estado de la conexión MQTT\n        """\n        return {\n            'connected': self.is_connected,\n            'client_id': MQTT_CONFIG['CLIENT_ID'],\n            'broker': MQTT_CONFIG['BROKER'],\n            'port': MQTT_CONFIG['PORT'],\n            'reconnect_attempts': self.reconnect_attempts,\n            'last_ping': self.last_ping,\n            'uptime': time.time(),\n            'free_memory': self.get_free_memory()\n        }\n\n# Instancia global del manager MQTT\nmqtt_manager = MQTTManager()