import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    required: [true, 'Purchase number is required'],
    unique: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  items: [purchaseItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

purchaseSchema.index({ supplier: 1, purchaseDate: -1 });

purchaseSchema.add({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});
purchaseSchema.index({ createdBy: 1 });

export default mongoose.model('Purchase', purchaseSchema);
