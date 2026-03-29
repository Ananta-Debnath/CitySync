import axios from 'axios';

// API base URL: read from environment with sensible fallbacks.
// For Create React App use `REACT_APP_API_URL`; for Vite use `VITE_API_URL`.
var API_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000';

API_URL = API_URL + (API_URL.endsWith('/api') ? '' : '/api'); // Ensure it ends with /api

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('citysync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Regions ────────────────────────────────────────────────────────
// export const getRegions    = ()         => api.get('/admin/regions');
export const createRegion  = (data)     => api.post('/admin/regions', data);
export const updateRegion  = (id, data) => api.put(`/admin/regions/${id}`, data);
export const deleteRegion  = (id)       => api.delete(`/admin/regions/${id}`);

// ── Dashboard ──────────────────────────────────────────────────────
export const getTableOverview = () => api.get('/admin/tables');

// ── Consumers ──────────────────────────────────────────────────────
export const getConsumers    = ()         => api.get('/admin/consumers');
export const updateConsumer  = (id, data) => api.put(`/admin/consumers/${id}`, data);

// ── Connections ────────────────────────────────────────────────────
export const getConnections         = ()         => api.get('/admin/connections');
export const createConnection       = (data)     => api.post('/admin/connections', data);           // NEW
export const updateConnectionStatus = (id, data) => api.put(`/admin/connections/${id}/status`, data); // CHANGED: was passing { connection_status: status }, now just pass data directly from the component

// ── Applications ───────────────────────────────────────────────────
export const getApplications         = ()         => api.get('/admin/applications');
export const updateApplicationStatus = (id, data) => api.put(`/admin/applications/${id}/status`, data);

// ── Complaints ─────────────────────────────────────────────────────
export const getComplaintsAdmin         = ()         => api.get('/admin/complaints');
export const updateComplaintStatusAdmin = (id, data) => api.put(`/admin/complaints/${id}/status`, data);
export const assignComplaint            = (id, data) => api.put(`/admin/complaints/${id}/assign`, data);
export const assignComplaintAuto        = (id, data) => api.post(`/admin/complaints/${id}/assign`, data);
export const approveComplaintChange     = (id) => api.post(`/admin/complaints/${id}/approve-change`);

// ── Meters ─────────────────────────────────────────────────────────
export const getMeters    = () =>     api.get('/admin/meters');
export const createMeter  = (data) => api.post('/admin/meters', data);                              // NEW

// ── Utilities ──────────────────────────────────────────────────────
export const getUtilities = () => api.get('/admin/utilities');                                      // NEW

// ── Tariffs ────────────────────────────────────────────────────────
export const getTariffs   = ()         => api.get('/admin/tariffs');
export const createTariff = (data)     => api.post('/admin/tariffs', data);                         // NEW
export const updateTariff = (id, data) => api.put(`/admin/tariffs/${id}`, data);                    // NEW

// ── Tariff Slabs ───────────────────────────────────────────────────
export const getTariffSlabs   = (tariffId)                => api.get(`/admin/tariffs/${tariffId}/slabs`);                           // NEW
export const createTariffSlab = (tariffId, data)          => api.post(`/admin/tariffs/${tariffId}/slabs`, data);                    // NEW
export const updateTariffSlab = (tariffId, slabNum, data) => api.put(`/admin/tariffs/${tariffId}/slabs/${slabNum}`, data);          // NEW
export const deleteTariffSlab = (tariffId, slabNum)       => api.delete(`/admin/tariffs/${tariffId}/slabs/${slabNum}`);             // NEW

// ── Fixed Charges ──────────────────────────────────────────────────
export const getFixedCharges   = (tariffId)       => api.get(`/admin/tariffs/${tariffId}/fixed-charges`);                          // NEW
export const createFixedCharge = (tariffId, data) => api.post(`/admin/tariffs/${tariffId}/fixed-charges`, data);                   // NEW
export const deleteFixedCharge = (tariffId, fcId) => api.delete(`/admin/tariffs/${tariffId}/fixed-charges/${fcId}`);               // NEW

// ── Billing ────────────────────────────────────────────────────────
export const getBills         = ()         => api.get('/admin/bills');                              // NEW
export const generateBill     = (data)     => api.post('/admin/bills/generate', data);              // NEW
export const updateBillStatus = (id, status) => api.put(`/admin/bills/${id}/status`, { bill_status: status }); // NEW

// ── Payments ───────────────────────────────────────────────────────
export const getPayments = () => api.get('/admin/payments');                                        // NEW

// ── Employees & Field Workers ──────────────────────────────────────
export const getEmployees   = () => api.get('/admin/employees');
export const getFieldWorkers = () => api.get('/admin/field-workers');

// ── Field Worker ───────────────────────────────────────────────────
export const getMyJobs                = ()         => api.get('/fieldworker/jobs');
export const updateJobStatus          = (id, data) => api.put(`/fieldworker/jobs/${id}/status`, data); // FIXED: was pointing to wrong /admin/complaints endpoint
export const getConnectionsForReading = ()       => api.get('/fieldworker/connections');
export const submitMeterReading       = (data)     => api.post('/fieldworker/readings', data);

// ── Fieldworker Profile ───────────────────────────────────────────
export const getFieldworkerProfile = () => api.get('/fieldworker/profile');
// export const updateFieldworkerProfile = (data) => api.put('/fieldworker/profile', data);
// export const updateFieldworkerAvatar = (data) => api.put('/fieldworker/avatar', data);
// export const deleteFieldworkerAvatar = () => api.delete('/fieldworker/avatar');
// export const changeFieldworkerPassword = (data) => api.put('/fieldworker/password', data);

// ── Public (no auth) ──────────────────────────────────────────────
export const getPublicTestDb = () => api.get('/public/test-db');
export const getRegions = () => api.get('/public/regions');
export const getPublicBanks = () => api.get('/public/banks');
export const getPublicUtilityNames = (reg_id) => api.get(`/public/utility-names/${reg_id}`);
export const getPublicMobileBankingProviders = () => api.get('/public/mobile-banking-providers');

// ── Profile (generic) ─────────────────────────────────────────────
export const getMyProfile = () => api.get('/profile/me');
export const updateProfile = (data) => api.put('/profile/profile', data);
export const updateAvatar = (data) => api.put('/profile/avatar', data);
export const deleteAvatar = () => api.delete('/profile/avatar');
export const changePassword = (data) => api.put('/profile/password', data);

// ── Notifications ─────────────────────────────────────────────────
export const getNotifications = () => api.get('/notifications');
export const markNotificationsRead = () => api.post('/notifications/mark-read');

// ── AI ────────────────────────────────────────────────────────────
export const callAiConsumer = (data) => api.post('/ai/consumer', data);
export const callAiEmployee = (data) => api.post('/ai/employee', data);

// ── Readings (Employee approval) ───────────────────────────────────
export const getReadings     = (params) => api.get('/admin/readings', { params });
export const getReadingById  = (id)     => api.get(`/admin/readings/${id}`);
export const approveReading  = (id)     => api.post(`/admin/readings/${id}/approve`);

// ── Admin profile & generic table ──────────────────────────────────
export const getAdminProfile = () => api.get('/admin/profile');
// export const updateAdminProfile = (data) => api.put('/admin/profile', data);
// export const updateAdminAvatar = (data) => api.put('/admin/avatar', data);
// export const deleteAdminAvatar = () => api.delete('/admin/avatar');
// export const adminChangePassword = (data) => api.put('/admin/password', data);
export const getTableData = (tableName) => api.get(`/admin/table/${tableName}`);
export const deleteTableRow = (tableName, id) => api.delete(`/admin/table/${tableName}/${id}`);

// ── Consumer (Shared/Dedicated) ───────────────────────────────────
export const getConsumerProfile        = () => api.get('/consumer/profile');
// export const updateConsumerProfile     = (data) => api.put('/consumer/profile', data);
export const getConsumerConnections    = () => api.get('/consumer/connections');
export const getConsumerConnectionById = (id) => api.get(`/consumer/connections/${id}`);
export const getConsumerBills          = (limit) => api.get('/consumer/bills', { params: { limit } });
export const getConsumerBillById       = (id) => api.get(`/consumer/bills/${id}`);
export const getConsumerUsage          = (params) => api.get('/consumer/usage', { params });
export const makeConsumerPayment       = (data) => api.post('/consumer/pay', data);
export const getConsumerComplaints     = () => api.get('/consumer/complaints');
export const createComplaint           = (data) => api.post('/consumer/complaints', data);
export const getApplicationsConsumer   = () => api.get('/consumer/applications');
export const submitConsumerApplication = (data) => api.post('/consumer/applications', data);
// export const updateConsumerAvatar      = (data) => api.put('/consumer/avatar', data);
// export const deleteConsumerAvatar      = () => api.delete('/consumer/avatar');
// export const changeConsumerPassword    = (data) => api.put('/consumer/password', data);
export const deactivateConsumerAccount = (data) => api.put('/consumer/deactivate', data);
export const getPaymentMethods         = () => api.get('/consumer/payment-methods');
export const addPaymentMethod          = (data) => api.post('/consumer/payment-methods', data);
export const setDefaultPaymentMethod   = (id) => api.put(`/consumer/payment-methods/${id}/default`);
export const deletePaymentMethod       = (id) => api.delete(`/consumer/payment-methods/${id}`);
export const getPaymentHistory         = () => api.get('/consumer/payment-history');
export const createRechargeBill        = (data) => api.post('/consumer/recharge', data);

// ── Auth ───────────────────────────────────────────────────────────
export const login    = (credentials) => api.post('/auth/login', credentials);
export const register = (userData)    => api.post('/auth/register', userData);

export default api;