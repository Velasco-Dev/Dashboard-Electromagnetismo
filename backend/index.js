// backend/index.js
// Punto de entrada principal - Inicia servidor Express y MQTT

require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const mqttClient = require('./mqtt/mqttClient');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    console.log('🚀 Iniciando Sistema de Monitoreo Solar...\n');
    
    // 1. Conectar a MongoDB
    await connectDB();
    
    // 2. Conectar a MQTT (no bloquea si falla - se reconectará automáticamente)
    mqttClient.connect().catch(err => {
      console.warn('⚠️ No se pudo conectar a MQTT inicialmente:', err.message);
      console.log('📌 El backend funcionará sin MQTT hasta que se reconecte.');
    });
    
    // 3. Iniciar servidor Express
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api/measurements`);
      console.log(`❤️ Health check en http://localhost:${PORT}/api/health\n`);
    });
    
  } catch (err) {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  }
}

// Manejar apagado graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Apagando sistema...');
  mqttClient.disconnect();
  process.exit(0);
});

start();
