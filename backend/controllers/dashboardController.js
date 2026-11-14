const { Patient, Doctor, Appointment, Invoice, Payment, AuditLog, Department, Visit } = require('../models');
const { successResponse } = require('../utils/apiResponse');

const getAdminDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // 1. KPI Counts
    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      todayAppointmentsCount,
      revenueAggregate,
      pendingInvoicesAggregate,
      appointmentStatusStats,
      departmentStats,
      recentAppointments,
      recentPatients,
      recentActivities
    ] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Doctor.countDocuments({ isAvailable: true }),
      Appointment.countDocuments(),
      Appointment.countDocuments({
        appointmentDate: { $gte: startOfToday, $lte: endOfToday }
      }),
      // Total Revenue from successful payments
      Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),
      // Pending payments sum from Invoices
      Invoice.aggregate([
        { $match: { paymentStatus: { $in: ['PENDING', 'PARTIALLY_PAID'] } } },
        {
          $group: {
            _id: null,
            totalPending: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
            count: { $sum: 1 }
          }
        }
      ]),
      // Status breakdown
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Department-wise doctors and appointments
      Department.aggregate([
        {
          $lookup: {
            from: 'doctors',
            localField: '_id',
            foreignField: 'departmentId',
            as: 'doctors'
          }
        },
        {
          $lookup: {
            from: 'appointments',
            localField: '_id',
            foreignField: 'departmentId',
            as: 'appointments'
          }
        },
        {
          $project: {
            name: 1,
            location: 1,
            doctorCount: { $size: '$doctors' },
            appointmentCount: { $size: '$appointments' }
          }
        }
      ]),
      // Recent appointments
      Appointment.find()
        .populate('patientId', 'name patientId phone')
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' }
        })
        .populate('departmentId', 'name')
        .sort({ createdAt: -1 })
        .limit(6),
      // Recently registered patients
      Patient.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(6),
      // Recent audit activities
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(8)
    ]);

    // Monthly Appointment Trends (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAppointments = await Appointment.aggregate([
      { $match: { appointmentDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$appointmentDate' },
            month: { $month: '$appointmentDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Monthly Revenue Trends
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'SUCCESS', paidAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyData = monthlyAppointments.map(item => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      appointments: item.count
    }));

    const formattedRevenueData = monthlyRevenue.map(item => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      revenue: item.revenue
    }));

    return successResponse(res, 'Admin dashboard statistics calculated', {
      stats: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        todayAppointments: todayAppointmentsCount,
        totalRevenue: revenueAggregate.length > 0 ? revenueAggregate[0].totalRevenue : 0,
        pendingAmount: pendingInvoicesAggregate.length > 0 ? pendingInvoicesAggregate[0].totalPending : 0,
        pendingInvoicesCount: pendingInvoicesAggregate.length > 0 ? pendingInvoicesAggregate[0].count : 0
      },
      charts: {
        monthlyAppointments: formattedMonthlyData,
        monthlyRevenue: formattedRevenueData,
        statusDistribution: appointmentStatusStats.map(s => ({ status: s._id, count: s.count })),
        departmentStats
      },
      recentAppointments,
      recentPatients,
      recentActivities
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorDashboardStats = async (req, res, next) => {
  try {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) {
      return successResponse(res, 'No doctor profile found', {
        todayAppointments: [],
        upcomingAppointments: [],
        completedVisitsCount: 0
      });
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [todayAppointments, upcomingAppointments, completedVisitsCount, totalPatientsServed] = await Promise.all([
      Appointment.find({
        doctorId: doctorProfile._id,
        appointmentDate: { $gte: startOfToday, $lte: endOfToday }
      })
        .populate('patientId', 'name patientId phone dateOfBirth gender bloodGroup')
        .sort({ startTime: 1 }),
      Appointment.find({
        doctorId: doctorProfile._id,
        appointmentDate: { $gt: endOfToday },
        status: { $in: ['BOOKED', 'CONFIRMED'] }
      })
        .populate('patientId', 'name patientId phone gender')
        .sort({ appointmentDate: 1, startTime: 1 })
        .limit(8),
      Visit.countDocuments({ doctorId: doctorProfile._id }),
      Appointment.distinct('patientId', {
        doctorId: doctorProfile._id,
        status: 'COMPLETED'
      })
    ]);

    return successResponse(res, 'Doctor dashboard statistics retrieved', {
      doctorProfile,
      todayAppointments,
      upcomingAppointments,
      metrics: {
        todayCount: todayAppointments.length,
        upcomingCount: upcomingAppointments.length,
        completedVisits: completedVisitsCount,
        uniquePatientsServed: totalPatientsServed.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardStats,
  getDoctorDashboardStats
};

