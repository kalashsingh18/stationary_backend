import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const query = {};
    // If the requester is an admin (not superadmin) show both:
    // - categories created by that admin
    // - global/seeded categories that don't have a `createdBy` field
    // This covers the common case where some categories were seeded
    // without a `createdBy` and should be visible to all admins.
    if (req.admin && req.admin.role !== 'superadmin') {
      query.$or = [
        { createdBy: req.admin._id },
        { createdBy: { $exists: false } },
        { createdBy: null }
      ];
    }

    const categories = await Category.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.admin) payload.createdBy = req.admin._id;

    const category = await Category.create(payload);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!existing.createdBy || existing.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot modify this category' });
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // ownership check
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!category.createdBy || category.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot delete this category' });
      }
    }

    const hasProducts = await Product.countDocuments({ category: category._id });

    if (hasProducts > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products'
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
