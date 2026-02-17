import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  description: {
    type: String,
    trim: true
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0
  },
  gstRate: {
    type: Number,
    required: [true, 'GST rate is required'],
    min: 0,
    max: 100,
    default: 18
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: 0
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: 0,
    default: 0
  },
  minStockLevel: {
    type: Number,
    default: 10
  },
  unit: {
    type: String,
    enum: ['piece', 'box', 'set', 'kg', 'liter'],
    default: 'piece'
  },
  isActive: {
    type: Boolean,
    default: true
  }
  ,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

productSchema.index({ name: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ createdBy: 1 });

export default mongoose.model('Product', productSchema);
