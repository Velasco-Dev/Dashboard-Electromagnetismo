// backend/models/Measurement.js
// Modelo para datos de mediciones solares

const { getDB } = require('../config/db');

const COLLECTION = 'measurements';

class Measurement {
  static async create(data) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    const document = {
      ...data,
      _receivedAt: new Date(),
      _createdAt: new Date()
    };
    
    const result = await collection.insertOne(document);
    return result;
  }

  static async findAll(limit = 100) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    return await collection
      .find()
      .sort({ _receivedAt: -1 })
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
      .find({ _receivedAt: { $gte: since } })
      .sort({ _receivedAt: -1 })
      .toArray();
  }

  static async getStats() {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    return await collection.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgVoltagePanel: { $avg: '$panel_voltage' },
          avgCurrentPanel: { $avg: '$panel_current' },
          avgVoltageBattery: { $avg: '$battery_voltage' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          minPower: { $min: '$power' }
        }
      }
    ]).toArray();
  }

  static async deleteOld(days = 30) {
    const db = getDB();
    const collection = db.collection(COLLECTION);
    
    const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await collection.deleteMany({ _receivedAt: { $lt: before } });
    
    return result;
  }
}

module.exports = Measurement;
