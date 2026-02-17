import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Supplier code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  contact: {
    phone: String,
    email: String,
    contactPerson: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  gstNumber: {
    type: String,
    trim: true
  },
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    accountHolderName: String
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

supplierSchema.index({ createdBy: 1 });

export default mongoose.model('Supplier', supplierSchema);
