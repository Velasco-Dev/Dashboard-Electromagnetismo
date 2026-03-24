// backend/routes/measurements.js
// Rutas para operaciones de mediciones

const express = require('express');
const router = express.Router();
const MeasurementController = require('../controllers/measurementController');

// GET /api/measurements - Obtener todas las mediciones
router.get('/', MeasurementController.getAll);

// GET /api/measurements/:id - Obtener medición por ID
router.get('/:id', MeasurementController.getById);

// GET /api/measurements/recent?minutes=60 - Obtener mediciones recientes
router.get('/recent', MeasurementController.getRecent);

// GET /api/measurements/stats - Obtener estadísticas
router.get('/stats', MeasurementController.getStats);

// DELETE /api/measurements/cleanup?days=30 - Eliminar datos antiguos
router.delete('/cleanup', MeasurementController.deleteOld);

module.exports = router;
