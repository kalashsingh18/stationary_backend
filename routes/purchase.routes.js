import express from 'express';
import {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePurchasePayment
} from '../controllers/purchase.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllPurchases)
  .post(createPurchase);

router.route('/:id')
  .get(getPurchaseById)
  .put(updatePurchase);

router.patch('/:id/payment', updatePurchasePayment);

export default router;
