const mongoose = require('mongoose');

const diagnosticReportSchema = new mongoose.Schema(
  {
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null
    },
    reportType: {
      type: String,
      required: [true, 'Report type is required'],
      trim: true
    },
    reportDate: {
      type: Date,
      default: Date.now
    },
    fileMetadata: {
      fileName: { type: String, default: '' },
      fileType: { type: String, default: 'application/pdf' },
      fileSizeKb: { type: Number, default: 0 },
      url: { type: String, default: '' }
    },
    resultsSummary: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    }
  },
  {
    timestamps: true
  }
);

diagnosticReportSchema.index({ patientId: 1, reportDate: -1 });

module.exports = mongoose.model('DiagnosticReport', diagnosticReportSchema);

