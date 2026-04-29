const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  patientCondition: {
    type: String,
    enum: ['Critical', 'Serious', 'Stable', 'Emergency'],
    required: true
  },
  currentHospital: { type: String, required: true },
  requiredResources: [{
    type: String,
    enum: ['ICU Bed', 'Ventilator', 'Specialist', 'Emergency Surgery']
  }],
  toHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  attachments: [{
    filename: { type: String },
    path: { type: String },
    mimetype: { type: String },
    size: { type: Number }
  }],
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in-transit', 'completed'],
    default: 'pending'
  },
  approvedAt: { type: Date },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalUser'
  },
  rejectedAt: { type: Date },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalUser'
  },
  rejectionReason: { type: String },
  notes: { type: String },
  estimatedETA: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('TransferRequest', transferSchema);
