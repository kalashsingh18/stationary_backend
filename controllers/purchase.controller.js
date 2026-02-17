import Purchase from '../models/Purchase.model.js';
import Product from '../models/Product.model.js';
import Supplier from '../models/Supplier.model.js';

const generatePurchaseNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const lastPurchase = await Purchase.findOne({
    purchaseNumber: new RegExp(`^PO${year}${month}`)
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastPurchase) {
    const lastSequence = parseInt(lastPurchase.purchaseNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `PO${year}${month}${String(sequence).padStart(4, '0')}`;
};

export const getAllPurchases = async (req, res, next) => {
  try {
    const { supplier, status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = {};

    // scope to admin's purchases if not superadmin
    if (req.admin && req.admin.role !== 'superadmin') {
      query.createdBy = req.admin._id;
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (status) {
      query.paymentStatus = status;
    }

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) {
        query.purchaseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.purchaseDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name code')
      .populate('items.product', 'name sku')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ purchaseDate: -1 });

    const total = await Purchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: purchases,
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

export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier', 'name code contact')
      .populate('items.product', 'name sku');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (req.admin && req.admin.role !== 'superadmin') {
      if (!purchase.createdBy || purchase.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your purchase' });
      }
    }

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (req, res, next) => {
  try {
    const { supplier, items } = req.body;

    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(400).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    let subtotal = 0;
    let gstAmount = 0;

    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      const itemTotal = item.quantity * item.unitPrice;
      const itemGst = (itemTotal * product.gstRate) / 100;

      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal
      });

      subtotal += itemTotal;
      gstAmount += itemGst;

      product.stock += item.quantity;
      await product.save();
    }

    const purchaseNumber = await generatePurchaseNumber();

    const payload = {
      purchaseNumber,
      supplier,
      items: processedItems,
      subtotal,
      gstAmount,
      totalAmount: subtotal + gstAmount,
      purchaseDate: req.body.purchaseDate || new Date(),
      notes: req.body.notes
    };

    if (req.admin) payload.createdBy = req.admin._id;

    const purchase = await Purchase.create(payload);

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('supplier', 'name code')
      .populate('items.product', 'name sku');

    res.status(201).json({
      success: true,
      data: populatedPurchase
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchase = async (req, res, next) => {
  try {
    const existing = await Purchase.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!existing.createdBy || existing.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot modify this purchase' });
      }
    }

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('supplier', 'name code')
      .populate('items.product', 'name sku');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchasePayment = async (req, res, next) => {
  try {
    const { paidAmount, paymentDate } = req.body;

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (req.admin && req.admin.role !== 'superadmin') {
      if (!purchase.createdBy || purchase.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your purchase' });
      }
    }

    purchase.paidAmount = paidAmount;
    purchase.paymentDate = paymentDate || new Date();

    if (paidAmount >= purchase.totalAmount) {
      purchase.paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      purchase.paymentStatus = 'partial';
    } else {
      purchase.paymentStatus = 'pending';
    }

    await purchase.save();

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};
