import Invoice from '../models/Invoice.model.js';
import Product from '../models/Product.model.js';
import Commission from '../models/Commission.model.js';
import School from '../models/School.model.js';

export const getSummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // apply ownership filter for non-superadmin admins
    const ownedIds = await (async () => {
      if (req.admin && req.admin.role !== 'superadmin') {
        const owned = await (await import('./_helpers.js')).getOwnedSchoolIds(req.admin);
        return owned;
      }
      return null;
    })();

    const todayMatch = { invoiceDate: { $gte: today } };
    const todayMatchScoped = (ownedIds && ownedIds.length) ? { $and: [todayMatch, { school: { $in: ownedIds } }] } : todayMatch;

    const todaySales = await Invoice.aggregate([
      { $match: todayMatchScoped },
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const monthMatch = { invoiceDate: { $gte: startOfMonth, $lte: endOfMonth } };
    const monthMatchScoped = (ownedIds && ownedIds.length) ? { $and: [monthMatch, { school: { $in: ownedIds } }] } : monthMatch;
    const monthSales = await Invoice.aggregate([
      { $match: monthMatchScoped },
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const productQuery = { $expr: { $lte: ['$stock', '$minStockLevel'] }, isActive: true };
    if (req.admin && req.admin.role !== 'superadmin') {
      // restrict products to those created by admin
      productQuery.createdBy = req.admin._id;
    }
    const lowStockProducts = await Product.find(productQuery).select('name sku stock minStockLevel').limit(10);

    const pendingMatch = { status: 'pending' };
    const pendingMatchScoped = (ownedIds && ownedIds.length) ? { $and: [pendingMatch, { school: { $in: ownedIds } }] } : pendingMatch;
    const pendingCommissions = await Commission.aggregate([
      { $match: pendingMatchScoped },
      { $group: { _id: null, totalAmount: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
    ]);

    const recentQuery = {};
    if (req.admin && req.admin.role !== 'superadmin') {
      if (ownedIds && ownedIds.length) recentQuery.school = { $in: ownedIds };
    }
    const recentInvoices = await Invoice.find(recentQuery)
      .sort({ invoiceDate: -1 })
      .limit(10)
      .populate('school', 'name code')
      .populate('student', 'name rollNumber class');

    const overviewMatch = { invoiceDate: { $gte: startOfMonth, $lte: endOfMonth } };
    const overviewMatchScoped = (ownedIds && ownedIds.length) ? { $and: [overviewMatch, { school: { $in: ownedIds } }] } : overviewMatch;

    const schoolOverview = await Invoice.aggregate([
      { $match: overviewMatchScoped },
      {
        $group: {
          _id: '$school',
          totalSales: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          invoiceCount: { $sum: 1 }
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
          totalSales: 1,
          totalCommission: 1,
          invoiceCount: 1
        }
      },
      {
        $sort: { totalSales: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        todaySales: {
          amount: todaySales[0]?.totalAmount || 0,
          count: todaySales[0]?.count || 0
        },
        monthSales: {
          amount: monthSales[0]?.totalAmount || 0,
          count: monthSales[0]?.count || 0
        },
        lowStockAlerts: {
          count: lowStockProducts.length,
          products: lowStockProducts
        },
        pendingCommissions: {
          amount: pendingCommissions[0]?.totalAmount || 0,
          count: pendingCommissions[0]?.count || 0
        },
        recentInvoices,
        schoolOverview
      }
    });
  } catch (error) {
    next(error);
  }
};
