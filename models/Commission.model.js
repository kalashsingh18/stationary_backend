import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice is required']
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'settled'],
    default: 'pending'
  },
  settlementDate: {
    type: Date
  },
  paymentReference: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

commissionSchema.index({ school: 1, month: 1, year: 1 });
commissionSchema.index({ status: 1 });

commissionSchema.add({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});
commissionSchema.index({ createdBy: 1 });

export default mongoose.model('Commission', commissionSchema);
