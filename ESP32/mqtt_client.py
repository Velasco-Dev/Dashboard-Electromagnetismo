# mqtt_client.py
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
        self.message_callback = None

        if not MQTT_CONFIG['CLIENT_ID'] or MQTT_CONFIG['CLIENT_ID'] == 'esp32_solar_001':
            import ubinascii
            mac = ubinascii.hexlify(machine.unique_id()).decode()
            MQTT_CONFIG['CLIENT_ID'] = "esp32_solar_{}".format(mac[-6:])

    def connect(self):
        try:
            print("🔌 Conectando a broker MQTT: {}:{}".format(
                MQTT_CONFIG['BROKER'],
                MQTT_CONFIG['PORT']
            ))
            print("📱 Client ID: {}".format(MQTT_CONFIG['CLIENT_ID']))

            self.client = MQTTClient(
                client_id=MQTT_CONFIG['CLIENT_ID'],
                server=MQTT_CONFIG['BROKER'],
                port=MQTT_CONFIG['PORT'],
                keepalive=MQTT_CONFIG['KEEPALIVE']
            )

            last_will = {
                'client': MQTT_CONFIG['CLIENT_ID'],
                'status': 'offline',
                'timestamp': int(time.time()),
                'reason': 'disconnected'
            }

            self.client.set_last_will(
                MQTT_CONFIG['TOPIC_STATUS'],
                json.dumps(last_will)
            )

            self.client.connect()

            if self.message_callback:
                self.client.set_callback(self.message_callback)

            self.is_connected = True
            self.reconnect_attempts = 0
            self.last_ping = time.time()

            print("✅ Conectado al broker MQTT exitosamente")
            self.publish_status('online')
            return True

        except Exception as e:
            print("❌ Error al conectar MQTT:", e)
            self.is_connected = False
            return False

    def disconnect(self):
        if self.client and self.is_connected:
            try:
                print("🔌 Desconectando del broker MQTT...")
                self.publish_status('offline', 'manual_disconnect')
                self.client.disconnect()
            except Exception as e:
                print("⚠️ Error al desconectar MQTT:", e)
            finally:
                self.is_connected = False
                self.client = None
                print("✅ Desconectado del broker MQTT")

    def publish(self, topic, data, retain=False):
        if not self.is_connected or not self.client:
            print("⚠️ No conectado a MQTT, no se puede publicar")
            return False

        try:
            if isinstance(data, dict):
                message = json.dumps(data)
            else:
                message = str(data)

            self.client.publish(topic, message, retain=retain)

            if SYSTEM_CONFIG['DEBUG']:
                print("📤 Publicado en {}: {}".format(topic, message[:100]))

            return True

        except Exception as e:
            print("❌ Error al publicar en {}: {}".format(topic, e))
            self.is_connected = False
            return False

    def publish_data(self, sensor_data):
        return self.publish(MQTT_CONFIG['TOPIC_DATA'], sensor_data)

    def publish_status(self, status, reason='normal'):
        status_data = {
            'client': MQTT_CONFIG['CLIENT_ID'],
            'status': status,
            'timestamp': int(time.time()),
            'reason': reason,
            'uptime': time.time(),
            'free_memory': self.get_free_memory()
        }
        return self.publish(MQTT_CONFIG['TOPIC_STATUS'], status_data, retain=True)

    def check_connection(self):
        if not self.is_connected or not self.client:
            return False

        try:
            current_time = time.time()
            if current_time - self.last_ping > MQTT_CONFIG['KEEPALIVE'] / 2:
                self.client.check_msg()
                self.last_ping = current_time
            return True

        except Exception as e:
            print("⚠️ Conexión MQTT perdida:", e)
            self.is_connected = False
            return False

    def reconnect(self):
        if self.is_connected:
            return True

        if self.reconnect_attempts >= self.max_reconnect_attempts:
            print("❌ Máximo número de intentos de reconexión MQTT alcanzado")
            return False

        self.reconnect_attempts += 1
        print("🔄 Reintentando conexión MQTT... ({}/{})".format(
            self.reconnect_attempts,
            self.max_reconnect_attempts
        ))

        if self.client:
            try:
                self.client.disconnect()
            except:
                pass
            self.client = None

        time.sleep(MQTT_CONFIG['RECONNECT_DELAY'])
        success = self.connect()

        if not success:
            print("⚠️ Falló la reconexión MQTT")

        return success

    def set_callback(self, callback):
        self.message_callback = callback
        if self.client:
            self.client.set_callback(callback)

    def subscribe(self, topic):
        if not self.is_connected or not self.client:
            print("⚠️ No conectado a MQTT, no se puede suscribir")
            return False

        try:
            self.client.subscribe(topic)
            print("✅ Suscrito a topic:", topic)
            return True
        except Exception as e:
            print("❌ Error al suscribirse a {}: {}".format(topic, e))
            return False

    def get_free_memory(self):
        try:
            import gc
            gc.collect()
            return gc.mem_free()
        except:
            return -1

    def get_connection_status(self):
        return {
            'connected': self.is_connected,
            'client_id': MQTT_CONFIG['CLIENT_ID'],
            'broker': MQTT_CONFIG['BROKER'],
            'port': MQTT_CONFIG['PORT'],
            'reconnect_attempts': self.reconnect_attempts,
            'last_ping': self.last_ping,
            'uptime': time.time(),
            'free_memory': self.get_free_memory()
        }

mqtt_manager = MQTTManager()
