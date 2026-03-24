# Backend - Sistema IoT Fotovoltaico

## Estructura Modular Profesional

```
backend/
├── index.js                          # Punto de entrada
├── app.js                            # Configuración Express
├── package.json                      # Dependencias
├── .env                              # Variables de entorno (NO subir)
├── .env.example                      # Plantilla de variables
│
├── config/
│   └── db.js                         # Conexión MongoDB
│
├── models/
│   └── Measurement.js                # Modelo de datos
│
├── controllers/
│   └── measurementController.js      # Lógica de negocio
│
├── routes/
│   └── measurements.js               # Rutas API
│
└── mqtt/
    └── mqttClient.js                 # Cliente MQTT
```

## Instalación

```bash
# 1. Ve a la carpeta backend
cd backend

# 2. Instala dependencias
npm install

# 3. Copia .env.example a .env y configura si es necesario
cp .env.example .env

# 4. Asegúrate que MongoDB está corriendo en localhost:27017
# (puedes usar: mongod)

# 5. Ejecuta el backend
npm start
```

## Endpoints API

### Obtener todas las mediciones
```
GET /api/measurements?limit=100
```

### Obtener mediciones recientes
```
GET /api/measurements/recent?minutes=60
```

### Obtener estadísticas
```
GET /api/measurements/stats
```

### Obtener medición por ID
```
GET /api/measurements/:id
```

### Eliminar datos antiguos
```
DELETE /api/measurements/cleanup?days=30
```

### Health check
```
GET /api/health
```

## Flujo de Datos

```
ESP32
  ↓
MQTT Broker (solar/data topic)
  ↓
Backend (mqttClient.js)
  ↓
MongoDB (measurements collection)
  ↓
API REST (Routes → Controllers → Models)
```

## Funciones del Modelo Measurement

- **create(data)** - Crear nueva medición
- **findAll(limit)** - Obtener todas las mediciones
- **findById(id)** - Obtener por ID
- **findRecent(minutes)** - Obtener de los últimos N minutos
- **getStats()** - Estadísticas: promedio, máximo, mínimo
- **deleteOld(days)** - Limpiar datos antiguos

## Variables de Entorno

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=solar
MQTT_BROKER=wss://broker.hivemq.com:8884/mqtt
MQTT_TOPIC=solar/data
PORT=3001
NODE_ENV=development
```

## Desarrollo

Para desarrollo con auto-reload:
```bash
npm run dev
```

(Requiere nodemon instalado globalmente o localmente)