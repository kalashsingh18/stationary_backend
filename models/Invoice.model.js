import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
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
  gstRate: {
    type: Number,
    required: true
  },
  gstAmount: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'partial'],
    default: 'paid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer'],
    default: 'cash'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

invoiceSchema.index({ school: 1, invoiceDate: -1 });
invoiceSchema.index({ student: 1 });
invoiceSchema.add({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});
invoiceSchema.index({ createdBy: 1 });


export default mongoose.model('Invoice', invoiceSchema);
