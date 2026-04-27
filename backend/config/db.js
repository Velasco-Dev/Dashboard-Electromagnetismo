// backend/config/db.js
// Configuración y conexión a MongoDB

// Forzar DNS de Google para resolver mongodb+srv:// aunque el ISP lo bloquee
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://alvarolpz:1234@cluster0.5mcoywc.mongodb.net/?appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'proyecto_panel';

let db = null;
let client = null;

async function connectDB() {
  try {
    client = new MongoClient(MONGO_URL, {
      serverSelectionTimeoutMS: 10000, // 10 segundos máximo para conectar
      connectTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(DB_NAME);
    
    console.log('✅ Conectado a MongoDB');
    console.log(`📊 Base de datos: ${DB_NAME}`);
    
    return db;
  } catch (err) {
    console.error('❌ Error al conectar a MongoDB:', err);
    throw err;
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database no inicializada. Llama a connectDB() primero.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};
