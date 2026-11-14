import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hospital_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 and Error Unwrapping
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('hospital_token');
      localStorage.removeItem('hospital_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout')
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id, data) => api.patch(`/users/${id}/status`, data)
};

export const patientAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  toggleStatus: (id) => api.patch(`/patients/${id}/status`),
  getAppointments: (id) => api.get(`/patients/${id}/appointments`),
  getMedicalRecords: (id) => api.get(`/patients/${id}/medical-records`)
};

export const doctorAPI = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  toggleAvailability: (id) => api.patch(`/doctors/${id}/availability`)
};

export const departmentAPI = {
  getAll: (params) => api.get('/departments', { params }),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`)
};

export const appointmentAPI = {
  getSlots: (doctorId, date) => api.get('/appointments/slots', { params: { doctorId, date } }),
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  book: (data) => api.post('/appointments', data),
  reschedule: (id, data) => api.put(`/appointments/${id}/reschedule`, data),
  cancel: (id, data) => api.patch(`/appointments/${id}/cancel`, data),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status })
};

export const visitAPI = {
  create: (data) => api.post('/visits', data),
  getById: (id) => api.get(`/visits/${id}`),
  update: (id, data) => api.put(`/visits/${id}`, data)
};

export const prescriptionAPI = {
  create: (data) => api.post('/prescriptions', data),
  getById: (id) => api.get(`/prescriptions/${id}`),
  getByPatient: (patientId) => api.get(`/prescriptions/patient/${patientId}`)
};

export const diagnosticAPI = {
  create: (data) => api.post('/diagnostic-reports', data),
  getByPatient: (patientId) => api.get(`/diagnostic-reports/patient/${patientId}`),
  updateStatus: (id, data) => api.patch(`/diagnostic-reports/${id}/status`, data)
};

export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  getByPatient: (patientId) => api.get(`/invoices/patient/${patientId}`),
  create: (data) => api.post('/invoices', data)
};

export const paymentAPI = {
  record: (data) => api.post('/payments', data),
  getByInvoice: (invoiceId) => api.get(`/payments/invoice/${invoiceId}`)
};

export const dashboardAPI = {
  getAdminStats: () => api.get('/dashboard/stats'),
  getDoctorStats: () => api.get('/dashboard/doctor')
};

export const reportAPI = {
  getAppointments: (params) => api.get('/reports/appointments', { params }),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getPendingInvoices: () => api.get('/reports/pending-invoices')
};

export const auditAPI = {
  getLogs: (params) => api.get('/audit-logs', { params })
};

export default api;

