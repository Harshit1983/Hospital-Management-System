const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment reference is required'],
      unique: true,
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
    symptoms: [
      {
        type: String,
        trim: true
      }
    ],
    consultationNotes: {
      type: String,
      required: [true, 'Consultation notes are required'],
      trim: true
    },
    clinicalObservations: {
      bloodPressure: { type: String, default: '' },
      pulseRate: { type: Number, min: 0, default: null },
      temperatureF: { type: Number, min: 0, default: null },
      weightKg: { type: Number, min: 0, default: null }
    },
    visitDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    followUpDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

visitSchema.index({ patientId: 1, visitDate: -1 });
visitSchema.index({ doctorId: 1, visitDate: -1 });

module.exports = mongoose.model('Visit', visitSchema);

