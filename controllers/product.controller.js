import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';

export const getAllProducts = async (req, res, next) => {
  try {
    const { category, stockStatus, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // scope to admin-created products for non-superadmins
    if (req.admin && req.admin.role !== 'superadmin') {
      query.createdBy = req.admin._id;
    }

    if (category) {
      query.category = category;
    }

    if (stockStatus === 'low') {
      query.$expr = { $lte: ['$stock', '$minStockLevel'] };
    } else if (stockStatus === 'out') {
      query.stock = 0;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('category', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
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

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (req.admin && req.admin.role !== 'superadmin') {
      if (!product.createdBy || product.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your product' });
      }
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const categoryExists = await Category.findById(req.body.category);

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    const payload = { ...req.body };
    if (req.admin) payload.createdBy = req.admin._id;

    const product = await Product.create(payload);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!existing.createdBy || existing.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot modify this product' });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (req.admin && req.admin.role !== 'superadmin') {
      if (!product.createdBy || product.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot delete this product' });
      }
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
