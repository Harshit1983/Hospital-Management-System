const { Appointment, Invoice, Payment, Doctor, Department } = require('../models');
const { successResponse } = require('../utils/apiResponse');

const getAppointmentsReport = async (req, res, next) => {
  try {
    const { groupBy = 'daily', startDate, endDate } = req.query;
    const match = {};

    if (startDate || endDate) {
      match.appointmentDate = {};
      if (startDate) match.appointmentDate.$gte = new Date(startDate);
      if (endDate) match.appointmentDate.$lte = new Date(endDate);
    }

    let report = [];

    if (groupBy === 'daily') {
      report = await Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' }
            },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
            booked: { $sum: { $cond: [{ $eq: ['$status', 'BOOKED'] }, 1, 0] } }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]);
    } else if (groupBy === 'doctor') {
      report = await Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$doctorId',
            totalAppointments: { $sum: 1 },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: '_id',
            foreignField: '_id',
            as: 'doctor'
          }
        },
        { $unwind: '$doctor' },
        {
          $lookup: {
            from: 'users',
            localField: 'doctor.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            doctorName: '$user.name',
            doctorId: '$doctor.doctorId',
            specialization: '$doctor.specialization',
            totalAppointments: 1,
            completedCount: 1,
            cancelledCount: 1
          }
        },
        { $sort: { totalAppointments: -1 } }
      ]);
    } else if (groupBy === 'department') {
      report = await Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$departmentId',
            totalAppointments: { $sum: 1 },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'department'
          }
        },
        { $unwind: '$department' },
        {
          $project: {
            departmentName: '$department.name',
            location: '$department.location',
            totalAppointments: 1,
            completedCount: 1
          }
        },
        { $sort: { totalAppointments: -1 } }
      ]);
    }

    return successResponse(res, `Appointments report (${groupBy}) generated`, report);
  } catch (error) {
    next(error);
  }
};

const getRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'SUCCESS' };

    if (startDate || endDate) {
      match.paidAt = {};
      if (startDate) match.paidAt.$gte = new Date(startDate);
      if (endDate) match.paidAt.$lte = new Date(endDate);
    }

    const [monthlyRevenue, methodBreakdown, totalRevenue] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
            revenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return successResponse(res, 'Financial revenue report generated', {
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      totalTransactions: totalRevenue.length > 0 ? totalRevenue[0].count : 0,
      monthlyBreakdown: monthlyRevenue,
      paymentMethodBreakdown: methodBreakdown
    });
  } catch (error) {
    next(error);
  }
};

const getPendingInvoicesReport = async (req, res, next) => {
  try {
    const pendingInvoices = await Invoice.find({
      paymentStatus: { $in: ['PENDING', 'PARTIALLY_PAID'] }
    })
      .populate('patientId', 'name patientId phone email')
      .sort({ dueDate: 1 });

    const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount - (inv.paidAmount || 0)), 0);

    return successResponse(res, 'Pending invoices report generated', {
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      count: pendingInvoices.length,
      invoices: pendingInvoices
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAppointmentsReport,
  getRevenueReport,
  getPendingInvoicesReport
};

