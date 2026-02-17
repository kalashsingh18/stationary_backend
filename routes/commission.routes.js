import express from 'express';
import {
  getAllCommissions,
  getSchoolCommissions,
  settleCommission,
  getCommissionSummary
} from '../controllers/commission.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/summary', getCommissionSummary);
router.get('/school/:id', getSchoolCommissions);

router.route('/')
  .get(getAllCommissions);

router.patch('/:id/settle', settleCommission);

export default router;
