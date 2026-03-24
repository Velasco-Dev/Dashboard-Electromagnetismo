# Sistema IoT Fotovoltaico Completo
## ESP32 + MicroPython + React + MQTT

### 🎯 Descripción del Sistema

Este es un sistema IoT completo para monitorear un sistema fotovoltaico en tiempo real, compuesto por:

- **ESP32 con MicroPython**: Recolecta datos de sensores INA219 y los envía vía MQTT
- **Broker MQTT**: HiveMQ público para comunicación en tiempo real
- **Dashboard React**: Interfaz web que muestra datos en vivo con fallback a simulación

### 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    ESP32        │    │   MQTT Broker   │    │   React Web     │
│   MicroPython   │───▶│    HiveMQ       │───▶│   Dashboard     │
│   + INA219      │    │  (WebSocket)    │    │   (Browser)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Flujo de Datos:**
1. ESP32 lee sensores INA219 cada 5 segundos
2. Envía datos JSON al broker MQTT (topic: `solar/data`)
3. React se conecta al mismo broker via WebSocket
4. Dashboard actualiza en tiempo real

### 📁 Estructura del Proyecto

```
Dashboard-Electromagnetismo/
├── ESP32/                     # Código MicroPython
│   ├── config.py             # Configuración del sistema
│   ├── wifi.py               # Gestión WiFi
│   ├── mqtt_client.py        # Cliente MQTT
│   ├── ina219.py             # Driver sensores INA219
│   └── main.py               # Programa principal
├── src/                      # Código React
│   ├── services/
│   │   └── mqttService.js    # Servicio MQTT para React
│   ├── hooks/
│   │   └── useSolarData.js   # Hook personalizado
│   └── ...
├── package.json              # Dependencias React
└── README.md                 # Este archivo
```

---

## 🔧 Configuración e Instalación

### 1. Configurar el ESP32

#### Hardware Requerido:
- ESP32 (cualquier modelo)
- 2-3 sensores INA219
- Resistencias shunt (0.1Ω)
- Cables y breadboard
- Sistema fotovoltaico básico (panel, batería)

#### Conexiones:

```
ESP32    <->    INA219 (Panel)    <->    Panel Solar
GPIO21   <->    SDA              <->    
GPIO22   <->    SCL              <->    
3.3V     <->    VCC              <->    
GND      <->    GND              <->    
         <->    VIN+             <->    Panel +
         <->    VIN-             <->    Panel - (via shunt)

ESP32    <->    INA219 (Batería)  <->   Batería
GPIO21   <->    SDA (I2C)        <->    
GPIO22   <->    SCL (I2C)        <->    
         <->    VIN+             <->    Batería +
         <->    VIN-             <->    Batería - (via shunt)
```

**Direcciones I2C:**
- INA219 Panel: 0x40 (por defecto)
- INA219 Batería: 0x41 (pin A0 conectado a VCC)
- INA219 Carga: 0x42 (pin A1 conectado a VCC) [Opcional]

#### Software:

1. **Instalar MicroPython en ESP32:**
   ```bash
   # Descargar firmware desde https://micropython.org/download/esp32/
   # Instalar esptool
   pip install esptool
   
   # Borrar flash
   esptool.py --chip esp32 erase_flash
   
   # Flashear MicroPython
   esptool.py --chip esp32 --port COM3 write_flash -z 0x1000 esp32-*.bin
   ```

2. **Configurar credenciales WiFi:**
   
   Editar `ESP32/config.py`:
   ```python
   WIFI_CONFIG = {
       'SSID': 'TU_RED_WIFI',        # ← Cambiar aquí
       'PASSWORD': 'TU_PASSWORD',     # ← Cambiar aquí
       'TIMEOUT': 15
   }
   ```

3. **Subir código al ESP32:**
   
   Usando herramientas como `rshell`, `ampy`, o Thonny IDE:
   ```bash
   # Con ampy
   ampy --port COM3 put config.py
   ampy --port COM3 put wifi.py
   ampy --port COM3 put mqtt_client.py
   ampy --port COM3 put ina219.py
   ampy --port COM3 put main.py
   ```

4. **Verificar funcionamiento:**
   ```bash
   # Conectar al puerto serie
   # Ver logs de conexión y envío de datos
   ```

### 2. Configurar el Dashboard React

#### Instalar Dependencias:

```bash
# En el directorio raíz del proyecto
npm install mqtt
```

#### Estructura de Datos MQTT:

**Topic de datos:** `solar/data`

**Formato JSON enviado por ESP32:**
```json
{
    "panel_voltage": 18.5,
    "panel_current": 2.340,
    "battery_voltage": 12.1,
    "battery_current": -1.850,
    "power": 43.29,
    "timestamp": 1710000000,
    "measurement_id": 156,
    "sensors_status": {
        "panel": {"connected": true, "errors": 0},
        "battery": {"connected": true, "errors": 0}
    }
}
```

#### Configuración MQTT:

El sistema usa **broker.hivemq.com** (público) vía WebSocket:
- **Broker**: `wss://broker.hivemq.com:8884/mqtt`
- **Topic**: `solar/data`
- **QoS**: 1
- **Retain**: false

#### Ejecutar Dashboard:

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

---

## 🚀 Uso del Sistema

### Funcionamiento Normal:

1. **Encender ESP32**: Se conecta automáticamente a WiFi y MQTT
2. **Abrir Dashboard**: Navegar a `http://localhost:5173`
3. **Visualizar datos**: Dashboard recibe datos cada 5 segundos del ESP32

### Modos de Operación:

1. **Modo Real (ESP32 conectado):**
   - Estado: "ESP32 Conectado - Datos en Tiempo Real"
   - Datos reales del sistema fotovoltaico
   - Actualización cada 5 segundos

2. **Modo Simulación (ESP32 desconectado):**
   - Estado: "Modo Simulación - Datos de Prueba"
   - Datos simulados realistas
   - Útil para desarrollo/demostración

### Indicadores de Estado:

- 🟢 **Verde**: ESP32 conectado, datos en tiempo real
- 🟡 **Amarillo**: Modo simulación, datos de prueba
- 🔴 **Rojo**: Error de conexión

---

## 🔍 Monitoreo y Debugging

### ESP32:

**Logs del sistema por puerto serie:**
```
📶 Iniciando conexión WiFi...
✅ WiFi conectado exitosamente!
🔌 Conectando a broker MQTT: broker.hivemq.com:1883
✅ Conectado al broker MQTT exitosamente!
🔧 Inicializando sensores INA219...
📊 Medicion #1 - (2024, 3, 24, 15, 30, 45, 0, 84)
   🌞 Panel:   18.5V / 2.340A
   🔋 Bateria: 12.1V / -1.850A
   ⚡ Potencia: 43.29W
```

### React Dashboard:

**Console del navegador:**
```
🔌 Conectando al broker MQTT... wss://broker.hivemq.com:8884/mqtt
✅ Conectado al broker MQTT
✅ Suscrito a topic: solar/data
📩 Mensaje recibido: {topic: "solar/data", data: {...}}
📊 Datos recibidos del ESP32: {panel_voltage: 18.5, ...}
```

### Solución de Problemas:

| Problema | Causa Probable | Solución |
|----------|----------------|-----------|
| ESP32 no conecta WiFi | Credenciales incorrectas | Verificar SSID/password en `config.py` |
| No hay datos en React | ESP32 offline | Verificar conexión/energía del ESP32 |
| Datos simulados permanentes | MQTT no conecta | Verificar conectividad a internet |
| Sensores no detectados | Cableado I2C incorrecto | Revisar conexiones SDA/SCL |
| Lecturas erróneas | Calibración incorrecta | Ajustar parámetros en `SENSORS_CONFIG` |

---

## 📊 Formato de Datos y APIs

### Datos del ESP32 (MQTT):

```typescript
interface SensorData {
    panel_voltage: number;     // Voltios (V)
    panel_current: number;     // Amperios (A)
    battery_voltage: number;   // Voltios (V)
    battery_current: number;   // Amperios (A, negativo = carga)
    power: number;            // Vatios (W)
    timestamp: number;        // Unix timestamp
    measurement_id?: number;  // ID secuencial
    sensors_status?: {        // Estado de sensores
        [sensor: string]: {
            connected: boolean;
            errors: number;
        }
    };
}
```

### Hook React (`useSolarData`):

```typescript
const {
    data: SensorData,         // Última lectura
    history: SensorData[],    // Historial (últimos 50)
    isConnected: boolean,     // Estado MQTT
    error: string | null,     // Error actual
    dataSource: string        // 'mqtt' | 'simulated' | 'connecting'
} = useSolarData();
```

---

## 🔐 Seguridad y Consideraciones

### Red y MQTT:
- Usando broker público HiveMQ (sin autenticación)
- Topics públicos - **NO usar en producción con datos sensibles**
- Para producción: usar broker privado con TLS/SSL y autenticación

### ESP32:
- Credenciales WiFi en código - considerar uso de NVS (Non-Volatile Storage)
- Watchdog habilitado para recovery automático
- Manejo de errores y reconexión automática

### React:
- MQTT sobre WebSocket seguro (WSS)
- Fallback automático a datos simulados
- Manejo de pérdida de conexión

---

## 🚀 Extensiones Futuras

### Hardware:
- [ ] Sensor de temperatura/humedad (DHT22)
- [ ] Display LCD/OLED local
- [ ] Control de relés para cargas
- [ ] Sensor de luz ambiental

### Software:
- [ ] Base de datos para histórico (InfluxDB)
- [ ] Alertas via email/Telegram
- [ ] Control remoto de cargas
- [ ] Predicción de generación solar
- [ ] Dashboard móvil (React Native)

### IoT:
- [ ] Over-the-Air (OTA) updates
- [ ] Configuración via web portal
- [ ] Múltiples ESP32 en red mesh
- [ ] Integración con Home Assistant

---

## 📞 Soporte

### Archivos de Configuración Importantes:

1. **ESP32/config.py** - Configuración principal del ESP32
2. **src/services/mqttService.js** - Configuración MQTT del dashboard
3. **src/hooks/useSolarData.js** - Lógica de datos en React

### Testing:

```bash
# Probar conexión MQTT desde línea de comandos:
mosquitto_pub -h broker.hivemq.com -t solar/data -m '{"test": true}'
mosquitto_sub -h broker.hivemq.com -t solar/data

# Ver datos en el dashboard sin ESP32:
# El sistema automáticamente usa datos simulados
```

### Logs Útiles:

- **ESP32**: Puerto serie (115200 baud)
- **React**: Console del navegador (F12)
- **MQTT**: Logs en ambos extremos con timestamps

---

**¡Sistema listo para producción académica y demostraciones!** 🎓⚡

El sistema está diseñado para ser robusto, con fallbacks automáticos y reconexión, perfecto para proyectos educativos y prototipos de sistemas fotovoltaicos IoT.