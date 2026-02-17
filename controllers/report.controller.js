import Invoice from '../models/Invoice.model.js';
import Product from '../models/Product.model.js';

export const getSalesReport = async (req, res, next) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;

    let dateQuery = {};

    if (startDate && endDate) {
      dateQuery = {
        invoiceDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (period) {
        case 'daily':
          dateQuery = { invoiceDate: { $gte: today } };
          break;
        case 'weekly':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateQuery = { invoiceDate: { $gte: weekAgo } };
          break;
        case 'monthly':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          dateQuery = { invoiceDate: { $gte: monthStart } };
          break;
      }
    }

    // apply ownership filter for non-superadmin admins
    const ownedIds = await (async () => {
      if (req.admin && req.admin.role !== 'superadmin') {
        const owned = await (await import('./_helpers.js')).getOwnedSchoolIds(req.admin);
        return owned;
      }
      return null;
    })();

    const baseMatch = (ownedIds && ownedIds.length) ? { $and: [dateQuery, { school: { $in: ownedIds } }] } : dateQuery;

    const salesData = await Invoice.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' }
          },
          totalSales: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const totalSummary = await Invoice.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalInvoices: { $sum: 1 }
        }
      }
    ]);

    const productWiseSales = await Invoice.aggregate([
      { $match: baseMatch },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        dateRange: {
          startDate: startDate || dateQuery.invoiceDate?.$gte,
          endDate: endDate || new Date()
        },
        dailySales: salesData,
        summary: totalSummary[0] || { totalSales: 0, totalCommission: 0, totalInvoices: 0 },
        topProducts: productWiseSales
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSchoolPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};

    if (startDate && endDate) {
      dateQuery.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // apply ownership filter for non-superadmin admins
    let matchForSchoolPerf = dateQuery;

    if (req.admin && req.admin.role !== 'superadmin') {
      const owned = await (await import('./_helpers.js')).getOwnedSchoolIds(req.admin);
      const ownedIds = owned;

      if (ownedIds && ownedIds.length) {
        matchForSchoolPerf = { $and: [dateQuery, { school: { $in: ownedIds } }] };
      } else {
        // if no schools owned, return empty
        matchForSchoolPerf = { $and: [dateQuery, { school: { $in: [] } }] };
      }
    }

    const schoolPerformance = await Invoice.aggregate([
      { $match: matchForSchoolPerf },
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
        $lookup: {
          from: 'students',
          let: { schoolId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$school', '$$schoolId'] },
                isActive: true
              }
            },
            {
              $count: 'total'
            }
          ],
          as: 'studentCount'
        }
      },
      {
        $project: {
          schoolId: '$_id',
          schoolName: '$schoolInfo.name',
          schoolCode: '$schoolInfo.code',
          commissionRate: '$schoolInfo.commissionRate',
          totalSales: 1,
          totalCommission: 1,
          invoiceCount: 1,
          totalStudents: {
            $ifNull: [{ $arrayElemAt: ['$studentCount.total', 0] }, 0]
          },
          averageSalePerInvoice: {
            $divide: ['$totalSales', { $max: ['$invoiceCount', 1] }]
          }
        }
      },
      {
        $sort: { totalSales: -1 }
      }
    ]);

    const classWisePerformance = await Invoice.aggregate([
      {
        $match: matchForSchoolPerf // reuse the same scoped match
      },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: '$studentInfo'
      },
      {
        $group: {
          _id: {
            school: '$school',
            class: '$studentInfo.class'
          },
          totalSales: { $sum: '$totalAmount' },
          studentCount: { $addToSet: '$student' }
        }
      },
      {
        $project: {
          school: '$_id.school',
          class: '$_id.class',
          totalSales: 1,
          studentCount: { $size: '$studentCount' }
        }
      },
      {
        $lookup: {
          from: 'schools',
          localField: 'school',
          foreignField: '_id',
          as: 'schoolInfo'
        }
      },
      {
        $unwind: '$schoolInfo'
      },
      {
        $project: {
          schoolName: '$schoolInfo.name',
          class: 1,
          totalSales: 1,
          studentCount: 1
        }
      },
      {
        $sort: { schoolName: 1, class: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        schoolPerformance,
        classWisePerformance
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryValuation = async (req, res, next) => {
  try {
    const productQuery = { isActive: true };
    if (req.admin && req.admin.role !== 'superadmin') {
      productQuery.createdBy = req.admin._id;
    }

    const products = await Product.find(productQuery)
      .populate('category', 'name')
      .sort({ category: 1, name: 1 });

    let totalValue = 0;
    let totalStock = 0;

    const productDetails = products.map(product => {
      const value = product.stock * product.basePrice;
      totalValue += value;
      totalStock += product.stock;

      return {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        stock: product.stock,
        minStockLevel: product.minStockLevel,
        basePrice: product.basePrice,
        sellingPrice: product.sellingPrice,
        totalValue: value,
        stockStatus: product.stock <= product.minStockLevel ? 'low' : 'adequate'
      };
    });

    const categoryWiseValuation = await Product.aggregate([
      {
        $match: productQuery // reuse the same query with createdBy filter
      },
      {
        $group: {
          _id: '$category',
          totalStock: { $sum: '$stock' },
          totalValue: {
            $sum: { $multiply: ['$stock', '$basePrice'] }
          },
          productCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          totalStock: 1,
          totalValue: 1,
          productCount: 1
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ]);

    const lowStockProducts = productDetails.filter(p => p.stockStatus === 'low');

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalStock,
          totalValue,
          lowStockCount: lowStockProducts.length
        },
        products: productDetails,
        categoryWiseValuation,
        lowStockProducts
      }
    });
  } catch (error) {
    next(error);
  }
};
