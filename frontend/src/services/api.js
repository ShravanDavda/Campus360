import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to automatically attach Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized and 403 Account Inactive
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized on protected route, clean token
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  verifyOtp: (payload) => api.post('/auth/verify-reset-otp', payload),
  resetPassword: (payload, token) =>
    api.post('/auth/reset-password', payload, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Common Member Dashboard API Service - Locked Contract
export const memberService = {
  // 1. Dashboard Home
  getDashboard: () => api.get('/member/dashboard'),

  // 2. Profile
  getProfile: () => api.get('/member/profile'),
  updateProfile: (data) => api.patch('/member/profile', data), // { name, phoneNumber }

  // 3. Membership
  getMembership: () => api.get('/member/membership'),

  // 4. Events
  getEvents: (params) => api.get('/member/events', { params }), // { page, limit }
  getEventDetails: (eventId) => api.get(`/member/events/${eventId}`),

  // 5. Tickets
  purchaseTicket: (data) => api.post('/member/tickets', data), // { eventId, ticketTypeId, quantity }
  getMyTickets: () => api.get('/member/tickets'),
  getTicketDetails: (ticketId) => api.get(`/member/tickets/${ticketId}`),

  // 6. Products / Merchandise
  getProducts: () => api.get('/member/products'),
  getProductDetails: (productId) => api.get(`/member/products/${productId}`),

  // 7. Orders
  createOrder: (data) => api.post('/member/orders', data), // { items: [{ productId, variantId, quantity }] }
  getMyOrders: () => api.get('/member/orders'),
  getOrderDetails: (orderId) => api.get(`/member/orders/${orderId}`),

  // 8. Announcements
  getAnnouncements: () => api.get('/member/announcements'),
  getAnnouncementDetails: (announcementId) => api.get(`/member/announcements/${announcementId}`),

  // 9. Payments
  getPayments: () => api.get('/member/payments'),
};

// Admin Service - Locked Contract
export const adminService = {
  // 1. List Members (optional query params: page, limit, status, role, search)
  getAdminMembers: (params = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.role && params.role !== 'all') cleanParams.role = params.role;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    return api.get('/admin/members', { params: cleanParams });
  },

  // 2. View Member Details
  getAdminMember: (userId) => api.get(`/admin/members/${userId}`),

  // 3. Activate Pending Member
  updateAdminMemberStatus: (userId, data) => api.patch(`/admin/members/${userId}/status`, data),
};

export default api;

