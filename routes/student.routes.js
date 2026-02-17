import express from 'express';
import multer from 'multer';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkUploadStudents
} from '../controllers/student.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(protect);

router.route('/')
  .get(getAllStudents)
  .post(createStudent);

router.post('/bulk-upload', upload.single('file'), bulkUploadStudents);

router.route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

export default router;
