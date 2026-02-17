import express from 'express';
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool
} from '../controllers/school.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllSchools)
  .post(createSchool);

router.route('/:id')
  .get(getSchoolById)
  .put(updateSchool)
  .delete(deleteSchool);

export default router;
