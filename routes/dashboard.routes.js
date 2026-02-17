import express from 'express';
import { getSummary } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', protect, getSummary);

export default router;
