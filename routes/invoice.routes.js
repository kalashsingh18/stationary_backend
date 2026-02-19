import express from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  generateInvoicePDF,
  searchStudent,
  lookupGst
} from '../controllers/invoice.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/search-student', searchStudent);
router.get('/lookup-gst/:gstin', lookupGst);

router.route('/')
  .get(getAllInvoices)
  .post(createInvoice);

router.get('/:id/pdf', generateInvoicePDF);

router.route('/:id')
  .get(getInvoiceById)
  .put(updateInvoice);

export default router;
