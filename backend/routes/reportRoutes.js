const express = require('express');
const { getReports, createReport, updateReport, deleteReport, getReport } = require('../controllers/reportController');
const router = express.Router();

router.get('/', getReports);
router.post('/', createReport);
router.get('/:id', getReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

module.exports = router;
