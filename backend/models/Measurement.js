// backend/models/Measurement.js
// Modelo para datos de mediciones solares

const { getDB } = require('../config/db');

const COLLECTION = 'info';

class Measurement {
  static async create(data) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    const document = {
      voltaje_panel: data.panel_voltage || 0,
      corriente_panel: data.panel_current || 0,
      voltaje_bateria: data.battery_voltage || 0,
      corriente_bateria: data.battery_current || 0,
      corriente_carga: data.load_current || 0,
      potencia: data.power || 0,
      estado_sensores: data.sensors_status || {},
      id_medicion: data.measurement_id || 0,
      marca_tiempo: data.timestamp || Math.floor(Date.now() / 1000),
      recibido_en: new Date(),
      creado_en: new Date()
    };
    
    const result = await collection.insertOne(document);
    return result;
  }

  static async findAll(limit = 100) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    return await collection
      .find()
      .sort({ recibido_en: -1 })
      .limit(limit)
      .toArray();
  }

  static async findById(id) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    const { ObjectId } = require('mongodb');
    
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findRecent(minutes = 60) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    return await collection
      .find({ recibido_en: { $gte: since } })
      .sort({ recibido_en: -1 })
      .toArray();
  }

  static async getStats() {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    return await collection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          voltaje_panel_promedio: { $avg: '$voltaje_panel' },
          corriente_panel_promedio: { $avg: '$corriente_panel' },
          voltaje_bateria_promedio: { $avg: '$voltaje_bateria' },
          potencia_promedio: { $avg: '$potencia' },
          potencia_maxima: { $max: '$potencia' },
          potencia_minima: { $min: '$potencia' }
        }
      }
    ]).toArray();
  }

  static async deleteOld(days = 30) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await collection.deleteMany({ recibido_en: { $lt: before } });
    
    return result;
  }
}

module.exports = Measurement;
