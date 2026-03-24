// backend/controllers/measurementController.js
// Controlador para operaciones de mediciones

const Measurement = require('../models/Measurement');

class MeasurementController {
  static async getAll(req, res) {
    try {
      const limit = req.query.limit || 100;
      const measurements = await Measurement.findAll(limit);
      
      res.json({
        success: true,
        count: measurements.length,
        data: measurements
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const measurement = await Measurement.findById(req.params.id);
      
      if (!measurement) {
        return res.status(404).json({
          success: false,
          error: 'Medición no encontrada'
        });
      }
      
      res.json({
        success: true,
        data: measurement
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  static async getRecent(req, res) {
    try {
      const minutes = req.query.minutes || 60;
      const measurements = await Measurement.findRecent(minutes);
      
      res.json({
        success: true,
        count: measurements.length,
        minutes: minutes,
        data: measurements
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  static async getStats(req, res) {
    try {
      const stats = await Measurement.getStats();
      
      res.json({
        success: true,
        data: stats[0] || {}
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  static async deleteOld(req, res) {
    try {
      const days = req.query.days || 30;
      const result = await Measurement.deleteOld(days);
      
      res.json({
        success: true,
        message: `${result.deletedCount} registros eliminados`,
        deletedCount: result.deletedCount
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
}

module.exports = MeasurementController;
