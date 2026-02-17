import Supplier from '../models/Supplier.model.js';

export const getAllSuppliers = async (req, res, next) => {
  try {
    const query = {};
    if (req.admin && req.admin.role !== 'superadmin') query.createdBy = req.admin._id;

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    if (req.admin && req.admin.role !== 'superadmin') {
      if (!supplier.createdBy || supplier.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your supplier' });
      }
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.admin) payload.createdBy = req.admin._id;
    const supplier = await Supplier.create(payload);

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this code already exists'
      });
    }
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const existing = await Supplier.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Supplier not found' });
    if (req.admin && req.admin.role !== 'superadmin') {
      if (!existing.createdBy || existing.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot modify this supplier' });
      }
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    if (req.admin && req.admin.role !== 'superadmin') {
      if (!supplier.createdBy || supplier.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot delete this supplier' });
      }
    }

    await supplier.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
