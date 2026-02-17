import School from '../models/School.model.js';
import Student from '../models/Student.model.js';
import Invoice from '../models/Invoice.model.js';
import Commission from '../models/Commission.model.js';

export const getAllSchools = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;

    const query = {};

    // restrict to schools created by the authenticated admin unless superadmin
    if (req.admin && req.admin.role !== 'superadmin') {
      query.createdBy = req.admin._id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const schools = await School.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await School.countDocuments(query);

    res.status(200).json({
      success: true,
      data: schools,
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

export const getSchoolById = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // ownership check for non-superadmins
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!school.createdBy || school.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your school' });
      }
    }

    const totalStudents = await Student.countDocuments({ school: school._id, isActive: true });

    const classWiseBreakdown = await Student.aggregate([
      {
        $match: { school: school._id, isActive: true }
      },
      {
        $group: {
          _id: '$class',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const salesData = await Invoice.aggregate([
      {
        $match: { school: school._id }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]);

    const commissionData = await Commission.aggregate([
      {
        $match: { school: school._id }
      },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const settlementHistory = await Commission.find({ school: school._id, status: 'settled' })
      .sort({ settlementDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        school,
        dashboard: {
          totalStudents,
          classWiseBreakdown,
          sales: salesData[0] || { totalSales: 0, totalCommission: 0, invoiceCount: 0 },
          commission: {
            pending: commissionData.find(c => c._id === 'pending') || { totalAmount: 0, count: 0 },
            settled: commissionData.find(c => c._id === 'settled') || { totalAmount: 0, count: 0 }
          },
          settlementHistory
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createSchool = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.admin) payload.createdBy = req.admin._id;

    const school = await School.create(payload);

    res.status(201).json({
      success: true,
      data: school
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'School with this code already exists'
      });
    }
    next(error);
  }
};

export const updateSchool = async (req, res, next) => {
  try {
    // ensure ownership for non-superadmins
    const existing = await School.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!existing.createdBy || existing.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot modify this school' });
      }
    }

    const school = await School.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    res.status(200).json({
      success: true,
      data: school
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // ownership check for non-superadmins
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!school.createdBy || school.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot delete this school' });
      }
    }

    const hasStudents = await Student.countDocuments({ school: school._id });

    if (hasStudents > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete school with existing students'
      });
    }

    await school.deleteOne();

    res.status(200).json({
      success: true,
      message: 'School deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
