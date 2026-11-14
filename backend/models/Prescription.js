const mongoose = require('mongoose');

const medicineItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      trim: true
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      required: [true, 'Visit reference is required'],
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
      required: [true, 'Doctor reference is required'],
      index: true
    },
    medicines: {
      type: [medicineItemSchema],
      validate: [val => val.length > 0, 'Prescription must contain at least one medicine']
    },
    generalInstructions: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);

