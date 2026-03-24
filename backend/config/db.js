// backend/config/db.js
// Configuración y conexión a MongoDB

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'proyecto_panel';

let db = null;
let client = null;

async function connectDB() {
  try {
    client = new MongoClient(MONGO_URL);
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
