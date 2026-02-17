import express from 'express';
import { createAdmin } from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// protect route - user must be authenticated; controller checks superadmin role
router.post('/', createAdmin);

export default router;
