import Student from '../models/Student.model.js';
import School from '../models/School.model.js';
import * as xlsx from 'xlsx';

export const getAllStudents = async (req, res, next) => {
  try {
    const { school, class: studentClass, section, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // restrict to students created by the authenticated admin unless superadmin
    if (req.admin && req.admin.role !== 'superadmin') {
      query.createdBy = req.admin._id;
    }

    if (school) {
      query.school = school;
    }

    if (studentClass) {
      query.class = studentClass;
    }

    if (section) {
      query.section = section;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const students = await Student.find(query)
      .populate('school', 'name code')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate('school', 'name code');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // ownership check
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!student.createdBy || student.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your student' });
      }
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const schoolExists = await School.findById(req.body.school);

    if (!schoolExists) {
      return res.status(400).json({
        success: false,
        message: 'School not found'
      });
    }

    // ownership check
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!schoolExists.createdBy || schoolExists.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot add students to this school' });
      }
    }

    const payload = { ...req.body };
    if (req.admin) payload.createdBy = req.admin._id;

    const student = await Student.create(payload);

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Student with this roll number already exists'
      });
    }
    next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    if (req.body.school) {
      const schoolExists = await School.findById(req.body.school);
      if (!schoolExists) {
        return res.status(400).json({
          success: false,
          message: 'School not found'
        });
      }
    }

    // ensure the student belongs to a school owned by user before updating
    const existing = await Student.findById(req.params.id).populate('school', 'createdBy');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!existing.createdBy || existing.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot modify this student' });
      }
    }

    // if changing school, ensure ownership of target school
    if (req.body.school && req.admin && req.admin.role !== 'superadmin') {
      const target = await School.findById(req.body.school).select('createdBy');
      if (!target || !target.createdBy || target.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot move student to this school' });
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('school', 'name code');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // ownership check
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!student.createdBy || student.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot delete this student' });
      }
    }

    await student.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUploadStudents = async (req, res, next) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const schoolExists = await School.findById(schoolId);

    if (!schoolExists) {
      return res.status(400).json({
        success: false,
        message: 'School not found'
      });
    }

    // ownership check for bulk upload
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!schoolExists.createdBy || schoolExists.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot upload for this school' });
      }
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const students = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        const studentData = {
          rollNumber: row.rollNumber || row.RollNumber,
          name: row.name || row.Name,
          school: schoolId,
          class: row.class || row.Class,
          section: row.section || row.Section,
          fatherName: row.fatherName || row.FatherName,
          motherName: row.motherName || row.MotherName,
          createdBy: req.admin ? req.admin._id : undefined,
          contact: {
            phone: row.phone || row.Phone,
            email: row.email || row.Email
          }
        };

        if (!studentData.rollNumber || !studentData.name || !studentData.class) {
          errors.push({
            row: i + 2,
            error: 'Missing required fields (rollNumber, name, class)'
          });
          continue;
        }

        students.push(studentData);
      } catch (error) {
        errors.push({
          row: i + 2,
          error: error.message
        });
      }
    }

    let insertedCount = 0;
    const insertErrors = [];

    for (const studentData of students) {
      try {
        await Student.create(studentData);
        insertedCount++;
      } catch (error) {
        insertErrors.push({
          rollNumber: studentData.rollNumber,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${insertedCount} students`,
      data: {
        totalRows: data.length,
        inserted: insertedCount,
        validationErrors: errors,
        insertErrors
      }
    });
  } catch (error) {
    next(error);
  }
};
