# 🚀 Instalación Rápida - Sistema IoT Fotovoltaico

## ⚡ Inicio Rápido (5 minutos)

### 1. Preparar React Dashboard

```bash
# 1. Instalar dependencias MQTT
npm install

# 2. Verificar que mqtt.js está instalado
npm list mqtt

# 3. Ejecutar dashboard
npm run dev
```

**El dashboard debería abrir en:** `http://localhost:5173`
**Estado inicial:** Modo simulación (datos de prueba)

### 2. Configurar ESP32 (Opcional)

**Si tienes hardware ESP32 + INA219:**

1. **Editar configuración WiFi:**
   ```python
   # ESP32/config.py - Líneas 6-10
   WIFI_CONFIG = {
       'SSID': 'TU_WIFI_AQUI',      # ← Cambiar
       'PASSWORD': 'TU_PASSWORD',   # ← Cambiar
       'TIMEOUT': 15
   }
   ```

2. **Subir código al ESP32:**
   - Usar Thonny IDE, ampy, o rshell
   - Subir todos los archivos .py de la carpeta ESP32/

3. **Reiniciar ESP32:**
   - Debería conectarse automáticamente
   - Dashboard cambiará a "datos reales"

---

## 🎯 ¿Qué hace cada archivo?

### Frontend (React):
- `src/services/mqttService.js` - Conecta con broker MQTT
- `src/hooks/useSolarData.js` - Maneja datos y fallback
- `src/App.jsx` - Dashboard principal actualizado

### Backend (ESP32):
- `ESP32/config.py` - Configuración WiFi/MQTT/Sensores
- `ESP32/main.py` - Programa principal del ESP32
- `ESP32/wifi.py` - Gestión conexión WiFi
- `ESP32/mqtt_client.py` - Cliente MQTT con reconexión
- `ESP32/ina219.py` - Driver sensores INA219

---

## 📊 Datos que verás

**Sin ESP32 (Simulación):**
- Datos realistas que cambian cada 5 segundos
- Variación solar según hora del día
- Banner amarillo: "Usando datos simulados"

**Con ESP32 conectado:**
- Datos reales de tus sensores INA219
- Banner verde: "ESP32 Conectado - Datos en Tiempo Real"
- Actualización cada 5 segundos desde hardware

---

## 🔧 Arquitectura MQTT

```
ESP32 → Topic: solar/data → HiveMQ Broker → React Dashboard
                ↓
        broker.hivemq.com:8884 (WebSocket)
```

**Formato datos:**
```json
{
  "panel_voltage": 18.5,
  "panel_current": 2.34,
  "battery_voltage": 12.1,
  "battery_current": -1.85,
  "power": 43.29,
  "timestamp": 1710000000
}
```

---

## ✅ Verificar que funciona

### Dashboard React:
1. Abrir http://localhost:5173
2. Ver datos cambiando cada 5 segundos
3. Console del navegador sin errores
4. Gráficos actualizándose

### ESP32 (con hardware):
1. LED interno parpadea al conectar WiFi
2. LED encendido = WiFi conectado
3. Parpadeo rápido cada 5s = datos enviados
4. Monitor serie muestra logs de conexión

---

## 🐛 Solución Problemas Comunes

| Problema | Solución Rápida |
|----------|-----------------|
| Dashboard no abre | `npm install` y `npm run dev` |
| "Conectando..." permanente | Normal sin ESP32, datos simulados en 10s |
| ESP32 no conecta WiFi | Verificar credenciales en config.py |
| Datos no llegan a React | Verificar internet y broker MQTT |

---

## 🎓 Para Desarrollo/Demo

**Sin hardware ESP32:**
- Sistema funciona 100% con datos simulados
- Perfecto para presentaciones y desarrollo
- Datos realistas basados en hora del día

**Con hardware básico:**
- Solo necesitas ESP32 + 1 sensor INA219
- Resto de sensores opcionales
- Sistema adaptativo según hardware detectado

---

## 📱 URLs Importantes

- **Dashboard:** http://localhost:5173
- **MQTT Broker:** wss://broker.hivemq.com:8884/mqtt
- **Topic Principal:** `solar/data`
- **Topic Estado:** `solar/status`

---

**🚀 ¡Sistema listo! El dashboard debería mostrar datos simulados inmediatamente.**

Para datos reales del ESP32, sigue la configuración de hardware en ESP32/README.md