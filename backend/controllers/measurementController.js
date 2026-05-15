// backend/controllers/measurementController.js
// Controlador para operaciones de mediciones

const Measurement = require('../models/Measurement');

class MeasurementController {
  static MAX_RANGE_MINUTES = 12 * 60;
  static MAX_POINTS = 500;

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

  static async getRange(req, res) {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros requeridos: from y to (ISO date)'
        });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Formato de fecha inválido. Use ISO 8601.'
        });
      }

      if (fromDate >= toDate) {
        return res.status(400).json({
          success: false,
          error: 'El parámetro from debe ser menor que to.'
        });
      }

      const requestedRangeMinutes = Math.ceil((toDate.getTime() - fromDate.getTime()) / (60 * 1000));

      if (requestedRangeMinutes > MeasurementController.MAX_RANGE_MINUTES) {
        return res.status(400).json({
          success: false,
          error: `Rango demasiado grande. Máximo permitido: ${MeasurementController.MAX_RANGE_MINUTES} minutos.`
        });
      }

      const measurements = await Measurement.findByTimeRange(
        fromDate,
        toDate,
        MeasurementController.MAX_POINTS
      );

      res.json({
        success: true,
        count: measurements.length,
        range: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          minutes: requestedRangeMinutes,
          maxAllowedMinutes: MeasurementController.MAX_RANGE_MINUTES,
          maxPoints: MeasurementController.MAX_POINTS
        },
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

  static async saveMeasurement(data) {
    try {
      // Guardar la medición en MongoDB
      const measurement = await Measurement.create(data);
      console.log('✅ Medición guardada:', measurement);
      return measurement;
    } catch (err) {
      console.error('❌ Error al guardar medición:', err.message);
      throw err;
    }
  }
}

module.exports = MeasurementController;
