import express from 'express';
import {
  getSalesReport,
  getSchoolPerformance,
  getInventoryValuation
} from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/sales', getSalesReport);
router.get('/school-performance', getSchoolPerformance);
router.get('/inventory-valuation', getInventoryValuation);

export default router;
