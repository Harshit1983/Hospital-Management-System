require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User,
  Doctor,
  Department,
  Patient,
  Appointment,
  Visit,
  Prescription,
  DiagnosticReport,
  Invoice,
  Payment,
  AuditLog
} = require('../models');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Hospital@123';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_management';
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    console.log('[Seeder] Purging existing database collections for clean repeatable seed...');
    await Promise.all([
      User.deleteMany({}),
      Doctor.deleteMany({}),
      Department.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      Visit.deleteMany({}),
      Prescription.deleteMany({}),
      DiagnosticReport.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    const commonPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // 1. Seed Departments
    console.log('[Seeder] Creating hospital departments...');
    const departments = await Department.create([
      {
        name: 'Cardiology',
        description: 'Comprehensive adult cardiovascular care, telemetry, and non-invasive diagnostics',
        location: 'Wing A, Level 3',
        isActive: true
      },
      {
        name: 'Neurology',
        description: 'Comprehensive neurological diagnostic and cognitive rehabilitation services',
        location: 'Wing B, Level 2',
        isActive: true
      },
      {
        name: 'Orthopedics',
        description: 'Musculoskeletal trauma, arthroplasty, and sports medicine consultations',
        location: 'Wing C, Ground Floor',
        isActive: true
      },
      {
        name: 'Pediatrics',
        description: 'Specialized infant, child, and adolescent comprehensive pediatric care',
        location: 'Wing D, Level 1',
        isActive: true
      },
      {
        name: 'General Medicine',
        description: 'Primary care triage, preventive screenings, and chronic illness management',
        location: 'Main Tower, Level 1',
        isActive: true
      },
      {
        name: 'Dermatology',
        description: 'Clinical cutaneous diagnostics, minor dermatosurgery, and allergy testing',
        location: 'Wing A, Level 1',
        isActive: true
      }
    ]);

    const deptMap = {};
    departments.forEach(d => {
      deptMap[d.name] = d._id;
    });

    // 2. Seed Users
    console.log('[Seeder] Creating system users with demo accounts...');
    const users = await User.create([
      {
        name: 'Chief Administrator Victoria Sterling',
        email: 'admin@hospital.demo',
        passwordHash: commonPasswordHash,
        role: 'ADMIN',
        isActive: true
      },
      {
        name: 'Dr. Sarah Jenkins',
        email: 'doctor@hospital.demo',
        passwordHash: commonPasswordHash,
        role: 'DOCTOR',
        isActive: true
      },
      {
        name: 'Dr. Robert Chen',
        email: 'doctor.neuro@hospital.demo',
        passwordHash: commonPasswordHash,
        role: 'DOCTOR',
        isActive: true
      },
      {
        name: 'Dr. Maya Patel',
        email: 'doctor.ortho@hospital.demo',
        passwordHash: commonPasswordHash,
        role: 'DOCTOR',
        isActive: true
      },
      {
        name: 'Reception Officer James Miller',
        email: 'reception@hospital.demo',
        passwordHash: commonPasswordHash,
        role: 'FRONT_DESK',
        isActive: true
      }
    ]);

    const adminUser = users[0];
    const docJenkinsUser = users[1];
    const docChenUser = users[2];
    const docPatelUser = users[3];
    const frontDeskUser = users[4];

    // Standard working schedule
    const standardSchedule = [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Saturday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true }
    ];

    // 3. Seed Doctors
    console.log('[Seeder] Provisioning doctor profiles...');
    const doctors = await Doctor.create([
      {
        userId: docJenkinsUser._id,
        doctorId: 'DOC-1001',
        specialization: 'Consultant Interventional Cardiologist',
        departmentId: deptMap['Cardiology'],
        qualification: 'MD, FACC, FSCAI (Harvard Medical School)',
        experienceYears: 14,
        consultationFee: 150,
        workingSchedule: standardSchedule,
        isAvailable: true
      },
      {
        userId: docChenUser._id,
        doctorId: 'DOC-1002',
        specialization: 'Senior Neuro-Physician',
        departmentId: deptMap['Neurology'],
        qualification: 'MBBS, DM Neurology, FAAN',
        experienceYears: 11,
        consultationFee: 140,
        workingSchedule: standardSchedule,
        isAvailable: true
      },
      {
        userId: docPatelUser._id,
        doctorId: 'DOC-1003',
        specialization: 'Orthopedic & Joint Replacement Surgeon',
        departmentId: deptMap['Orthopedics'],
        qualification: 'MS Orthopedics, MCh (UK)',
        experienceYears: 9,
        consultationFee: 120,
        workingSchedule: standardSchedule,
        isAvailable: true
      }
    ]);

    const doctorJenkins = doctors[0];
    const doctorChen = doctors[1];
    const doctorPatel = doctors[2];

    // 4. Seed Patients
    console.log('[Seeder] Registering synthetic patients...');
    const patients = await Patient.create([
      {
        patientId: 'PAT-2026-0001',
        name: 'Eleanor Vance',
        dateOfBirth: new Date('1988-04-12'),
        gender: 'FEMALE',
        phone: '+1-555-0144',
        email: 'eleanor.vance@example.demo',
        address: { street: '742 Evergreen Terrace', city: 'Metro City', state: 'IL', postalCode: '60007' },
        emergencyContact: { name: 'Arthur Vance', relationship: 'Spouse', phone: '+1-555-0145' },
        bloodGroup: 'A+',
        allergies: ['Penicillin'],
        isActive: true
      },
      {
        patientId: 'PAT-2026-0002',
        name: 'Marcus Brody',
        dateOfBirth: new Date('1975-09-23'),
        gender: 'MALE',
        phone: '+1-555-0182',
        email: 'marcus.brody@example.demo',
        address: { street: '124 Museum Way', city: 'Metro City', state: 'IL', postalCode: '60002' },
        emergencyContact: { name: 'Evelyn Brody', relationship: 'Sister', phone: '+1-555-0183' },
        bloodGroup: 'O+',
        allergies: ['Sulfa Drugs'],
        isActive: true
      },
      {
        patientId: 'PAT-2026-0003',
        name: 'Sofia Al-Mansoor',
        dateOfBirth: new Date('1994-11-05'),
        gender: 'FEMALE',
        phone: '+1-555-0291',
        email: 'sofia.mansoor@example.demo',
        address: { street: '88 Skyline Blvd Apt 4B', city: 'Metro City', state: 'IL', postalCode: '60010' },
        emergencyContact: { name: 'Tariq Al-Mansoor', relationship: 'Brother', phone: '+1-555-0292' },
        bloodGroup: 'B+',
        allergies: [],
        isActive: true
      },
      {
        patientId: 'PAT-2026-0004',
        name: 'David Kim',
        dateOfBirth: new Date('1968-02-18'),
        gender: 'MALE',
        phone: '+1-555-0377',
        email: 'david.kim@example.demo',
        address: { street: '512 Oakridge Court', city: 'Metro City', state: 'IL', postalCode: '60014' },
        emergencyContact: { name: 'Grace Kim', relationship: 'Spouse', phone: '+1-555-0378' },
        bloodGroup: 'AB+',
        allergies: ['Aspirin'],
        isActive: true
      },
      {
        patientId: 'PAT-2026-0005',
        name: 'Chloe Tremblay',
        dateOfBirth: new Date('2001-07-30'),
        gender: 'FEMALE',
        phone: '+1-555-0455',
        email: 'chloe.tremblay@example.demo',
        address: { street: '304 Riverdale Crescent', city: 'Metro City', state: 'IL', postalCode: '60018' },
        emergencyContact: { name: 'Luc Tremblay', relationship: 'Father', phone: '+1-555-0456' },
        bloodGroup: 'O-',
        allergies: [],
        isActive: true
      }
    ]);

    // 5. Seed Appointments
    console.log('[Seeder] Creating realistic appointment encounters...');
    const now = new Date();
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const appointments = await Appointment.create([
      // Past completed appointment (Eleanor Vance with Dr. Jenkins)
      {
        patientId: patients[0]._id,
        doctorId: doctorJenkins._id,
        departmentId: deptMap['Cardiology'],
        appointmentDate: yesterdayStr,
        startTime: '09:30',
        endTime: '10:00',
        reason: 'Recurrent palpitations and exertional dyspnea evaluation',
        status: 'COMPLETED',
        createdBy: frontDeskUser._id
      },
      // Today appointment 1 (Marcus Brody with Dr. Jenkins)
      {
        patientId: patients[1]._id,
        doctorId: doctorJenkins._id,
        departmentId: deptMap['Cardiology'],
        appointmentDate: todayStr,
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Cardiovascular risk stratification and BP monitoring follow-up',
        status: 'CONFIRMED',
        createdBy: frontDeskUser._id
      },
      // Today appointment 2 (Sofia Al-Mansoor with Dr. Chen)
      {
        patientId: patients[2]._id,
        doctorId: doctorChen._id,
        departmentId: deptMap['Neurology'],
        appointmentDate: todayStr,
        startTime: '11:00',
        endTime: '11:30',
        reason: 'Migraine with aura episodes escalating in frequency',
        status: 'BOOKED',
        createdBy: frontDeskUser._id
      },
      // Tomorrow appointment (David Kim with Dr. Patel)
      {
        patientId: patients[3]._id,
        doctorId: doctorPatel._id,
        departmentId: deptMap['Orthopedics'],
        appointmentDate: tomorrowStr,
        startTime: '14:00',
        endTime: '14:30',
        reason: 'Right knee anterior cruciate ligament stiffness and post-trauma ache',
        status: 'CONFIRMED',
        createdBy: frontDeskUser._id
      },
      // Past Cancelled appointment
      {
        patientId: patients[4]._id,
        doctorId: doctorJenkins._id,
        departmentId: deptMap['Cardiology'],
        appointmentDate: yesterdayStr,
        startTime: '11:30',
        endTime: '12:00',
        reason: 'Annual preventive cardiology screening',
        status: 'CANCELLED',
        cancellationReason: 'Patient travel emergency',
        createdBy: frontDeskUser._id
      }
    ]);

    const completedAppt = appointments[0];

    // 6. Seed Clinical Visit for Completed Appointment
    console.log('[Seeder] Creating authorized clinical visit & notes...');
    const visit = await Visit.create({
      appointmentId: completedAppt._id,
      patientId: patients[0]._id,
      doctorId: doctorJenkins._id,
      consultationNotes: 'Patient presented with intermittent palpitations and shortness of breath upon stair climbing. Auscultation reveals normal S1/S2 heart sounds, no audible murmurs or gallops. Advised resting 12-lead ECG and lipid panel. Initiated low-dose beta blocker therapy with lifestyle modification.',
      symptoms: ['Palpitations', 'Exertional dyspnea', 'Mild fatigue'],
      clinicalObservations: {
        bloodPressure: '138/86 mmHg',
        pulseRate: 88,
        temperatureF: 98.6,
        weightKg: 64.5
      },
      visitDate: yesterdayStr,
      followUpDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)
    });

    // 7. Seed Prescription for Visit
    console.log('[Seeder] Adding clinical prescription...');
    await Prescription.create({
      visitId: visit._id,
      patientId: patients[0]._id,
      doctorId: doctorJenkins._id,
      medicines: [
        {
          name: 'Metoprolol Succinate ER',
          dosage: '25mg',
          frequency: 'Once daily in the morning',
          duration: '30 days',
          instructions: 'Take with or immediately after morning breakfast with a full glass of water'
        },
        {
          name: 'Atorvastatin Calcium',
          dosage: '20mg',
          frequency: 'Once daily at bedtime',
          duration: '30 days',
          instructions: 'Take in the evening. Report any unexplained muscle aches immediately.'
        }
      ],
      generalInstructions: 'Maintain low-sodium diet (<2g daily), avoid excess caffeine, log home blood pressure readings twice weekly.'
    });

    // 8. Seed Diagnostic Report Metadata
    console.log('[Seeder] Generating diagnostic report metadata...');
    await DiagnosticReport.create([
      {
        visitId: visit._id,
        patientId: patients[0]._id,
        doctorId: doctorJenkins._id,
        reportType: '12-Lead Resting Electrocardiogram (ECG)',
        reportDate: yesterdayStr,
        fileMetadata: {
          fileName: 'ecg_vance_eleanor_2026.pdf',
          fileType: 'application/pdf',
          fileSizeKb: 342,
          url: '/reports/ecg_vance_eleanor_2026.pdf'
        },
        resultsSummary: 'Normal sinus rhythm with heart rate 78 bpm. Normal axis, no acute ST-segment elevation or T-wave inversion noted.',
        status: 'COMPLETED'
      },
      {
        visitId: visit._id,
        patientId: patients[0]._id,
        doctorId: doctorJenkins._id,
        reportType: 'Comprehensive Fasting Lipid Profile',
        reportDate: yesterdayStr,
        fileMetadata: {
          fileName: 'lipid_panel_2026.pdf',
          fileType: 'application/pdf',
          fileSizeKb: 215,
          url: '/reports/lipid_panel_2026.pdf'
        },
        resultsSummary: 'Total Cholesterol: 218 mg/dL, LDL-C: 138 mg/dL, HDL-C: 48 mg/dL, Triglycerides: 160 mg/dL.',
        status: 'COMPLETED'
      }
    ]);

    // 9. Seed Invoices & Simulated Payments
    console.log('[Seeder] Generating billing invoices and simulated payments...');
    const invoice1 = await Invoice.create({
      invoiceNumber: 'INV-2026-00001',
      patientId: patients[0]._id,
      appointmentId: completedAppt._id,
      items: [
        { description: 'Cardiology Specialist Clinical Consultation (Dr. Jenkins)', quantity: 1, unitPrice: 150, total: 150 },
        { description: '12-Lead Resting Electrocardiogram (ECG) Procedure', quantity: 1, unitPrice: 85, total: 85 },
        { description: 'Hospital Facility & Registration Service Fee', quantity: 1, unitPrice: 25, total: 25 }
      ],
      subtotal: 260,
      tax: 13, // 5%
      discount: 20,
      totalAmount: 253,
      paidAmount: 253,
      paymentStatus: 'PAID',
      dueDate: yesterdayStr,
      notes: 'Consultation and routine diagnostics invoice'
    });

    // Record completed payment for invoice 1
    await Payment.create({
      invoiceId: invoice1._id,
      patientId: patients[0]._id,
      amount: 253,
      paymentMethod: 'CARD_SIMULATED',
      transactionReference: 'TXN-SIM-2026-98101',
      status: 'SUCCESS',
      paidAt: yesterdayStr,
      notes: 'Paid via simulated contactless Visa ending in 4242'
    });

    // Invoice 2: Pending invoice for Marcus Brody
    const invoice2 = await Invoice.create({
      invoiceNumber: 'INV-2026-00002',
      patientId: patients[1]._id,
      appointmentId: appointments[1]._id,
      items: [
        { description: 'Cardiology Follow-Up Consultation Fee', quantity: 1, unitPrice: 150, total: 150 },
        { description: 'Automated 24-hr Holter Telemetry Deposit', quantity: 1, unitPrice: 120, total: 120 }
      ],
      subtotal: 270,
      tax: 13.5,
      discount: 0,
      totalAmount: 283.5,
      paidAmount: 100,
      paymentStatus: 'PARTIALLY_PAID',
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
      notes: 'Partial deposit received at reception desk'
    });

    await Payment.create({
      invoiceId: invoice2._id,
      patientId: patients[1]._id,
      amount: 100,
      paymentMethod: 'CASH',
      transactionReference: 'TXN-SIM-2026-98102',
      status: 'SUCCESS',
      paidAt: todayStr,
      notes: 'Cash deposit recorded at front desk'
    });

    // 10. Seed Audit Logs
    console.log('[Seeder] Generating compliance audit logs...');
    await AuditLog.create([
      {
        userId: adminUser._id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'System',
        entityId: 'SYS-INIT',
        timestamp: new Date(Date.now() - 3600000 * 24 * 2),
        details: { message: 'Hospital database initialized with security baselines and clinical catalogs' },
        ipAddress: '127.0.0.1'
      },
      {
        userId: frontDeskUser._id,
        userName: frontDeskUser.name,
        userRole: frontDeskUser.role,
        action: 'PATIENT_CREATE',
        entityType: 'Patient',
        entityId: String(patients[0]._id),
        timestamp: yesterdayStr,
        details: { patientId: patients[0].patientId, name: patients[0].name },
        ipAddress: '192.168.1.104'
      },
      {
        userId: frontDeskUser._id,
        userName: frontDeskUser.name,
        userRole: frontDeskUser.role,
        action: 'APPOINTMENT_BOOK',
        entityType: 'Appointment',
        entityId: String(completedAppt._id),
        timestamp: yesterdayStr,
        details: { doctorId: doctorJenkins._id, slot: '09:30' },
        ipAddress: '192.168.1.104'
      },
      {
        userId: docJenkinsUser._id,
        userName: docJenkinsUser.name,
        userRole: docJenkinsUser.role,
        action: 'VISIT_CREATE',
        entityType: 'Visit',
        entityId: String(visit._id),
        timestamp: yesterdayStr,
        details: { patient: patients[0].name, appointmentId: completedAppt._id },
        ipAddress: '192.168.1.112'
      },
      {
        userId: frontDeskUser._id,
        userName: frontDeskUser.name,
        userRole: frontDeskUser.role,
        action: 'PAYMENT_RECORD',
        entityType: 'Payment',
        entityId: 'TXN-SIM-2026-98101',
        timestamp: yesterdayStr,
        details: { amount: 253, method: 'CARD_SIMULATED', invoice: invoice1.invoiceNumber },
        ipAddress: '192.168.1.104'
      }
    ]);

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('DEMO ACCOUNTS (Password configured via environment variable)');
    console.log('1. Admin:      admin@hospital.demo       (Full Administrative Access)');
    console.log('2. Doctor:     doctor@hospital.demo      (Clinical Workspace & Records)');
    console.log('3. Doctor:     doctor.neuro@hospital.demo(Neurologist Workspace)');
    console.log('4. Front Desk: reception@hospital.demo   (Triage, Scheduling & Billing)');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error]: ${error.message}`, error);
    process.exit(1);
  }
};

seedDatabase();

