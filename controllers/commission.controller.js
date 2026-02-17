import Commission from '../models/Commission.model.js';
import School from '../models/School.model.js';

export const getAllCommissions = async (req, res, next) => {
  try {
    const { school, status, month, year, page = 1, limit = 10 } = req.query;

    const query = {};

    // scope to admin-owned schools unless superadmin
    if (req.admin && req.admin.role !== 'superadmin') {
      const owned = await School.find({ createdBy: req.admin._id }).select('_id');
      const ownedIds = owned.map(s => s._id.toString());
      if (school) {
        if (!ownedIds.includes(school.toString())) {
          return res.status(403).json({ success: false, message: 'Forbidden: school not owned' });
        }
        query.school = school;
      } else {
        query.school = { $in: ownedIds };
      }
    } else if (school) {
      query.school = school;
    }

    if (status) {
      query.status = status;
    }

    if (month) {
      query.month = parseInt(month);
    }

    if (year) {
      query.year = parseInt(year);
    }

    const skip = (page - 1) * limit;

    const commissions = await Commission.find(query)
      .populate('school', 'name code')
      .populate('invoice', 'invoiceNumber invoiceDate')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ year: -1, month: -1, createdAt: -1 });

    const total = await Commission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: commissions,
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

export const getSchoolCommissions = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ownership: ensure admin can view this school's commissions
    if (req.admin && req.admin.role !== 'superadmin') {
      const school = await School.findById(id).select('createdBy');
      if (!school || !school.createdBy || school.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your school' });
      }
    }

    const commissions = await Commission.find({ school: id })
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .sort({ year: -1, month: -1 });

    const monthlyBreakdown = await Commission.aggregate([
      {
        $match: { school: id }
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          totalCommission: { $sum: '$commissionAmount' },
          totalBaseAmount: { $sum: '$baseAmount' },
          count: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0]
            }
          },
          settled: {
            $sum: {
              $cond: [{ $eq: ['$status', 'settled'] }, '$commissionAmount', 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        commissions,
        monthlyBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

export const settleCommission = async (req, res, next) => {
  try {
    const { paymentReference, settlementDate, notes } = req.body;

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found'
      });
    }

    if (commission.status === 'settled') {
      return res.status(400).json({
        success: false,
        message: 'Commission already settled'
      });
    }

    // ownership: ensure admin owns the school's commission
    if (req.admin && req.admin.role !== 'superadmin') {
      const school = await School.findById(commission.school).select('createdBy');
      if (!school || !school.createdBy || school.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot settle commission for this school' });
      }
    }

    commission.status = 'settled';
    commission.settlementDate = settlementDate || new Date();
    commission.paymentReference = paymentReference;
    commission.notes = notes;

    await commission.save();

    res.status(200).json({
      success: true,
      data: commission
    });
  } catch (error) {
    next(error);
  }
};

export const getCommissionSummary = async (req, res, next) => {
  try {
    const summary = await Commission.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const pending = summary.find(s => s._id === 'pending') || { totalAmount: 0, count: 0 };
    const settled = summary.find(s => s._id === 'settled') || { totalAmount: 0, count: 0 };

    const schoolWiseSummary = await Commission.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: '$school',
          totalPending: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'schools',
          localField: '_id',
          foreignField: '_id',
          as: 'schoolInfo'
        }
      },
      {
        $unwind: '$schoolInfo'
      },
      {
        $project: {
          schoolId: '$_id',
          schoolName: '$schoolInfo.name',
          schoolCode: '$schoolInfo.code',
          totalPending: 1,
          count: 1
        }
      },
      {
        $sort: { totalPending: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          pending,
          settled,
          total: {
            amount: pending.totalAmount + settled.totalAmount,
            count: pending.count + settled.count
          }
        },
        schoolWiseSummary
      }
    });
  } catch (error) {
    next(error);
  }
};
