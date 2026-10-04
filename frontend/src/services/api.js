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
  getMembershipPlans: () => api.get('/member/membership/plans'),
  getMembership: () => api.get('/member/membership'),
  applyMembership: (data) => api.post('/member/membership/apply', data),
  payMembershipDues: (data = {}) => api.post('/member/membership/pay-dues', data),

  // 4. Events
  getEvents: (params) => api.get('/member/events', { params }), // { page, limit }
  getEventDetails: (eventId) => api.get(`/member/events/${eventId}`),

  // 5. Tickets
  purchaseTicket: (data) => api.post('/member/tickets', data), // { eventId, ticketTypeId, quantity }
  getMyTickets: () => api.get('/member/tickets'),
  getTicketDetails: (ticketId) => api.get(`/member/tickets/${ticketId}`),

  // 6. Products / Merchandise
  getProducts: (params = {}) => api.get('/member/products', { params }),
  getProductDetails: (productId) => api.get(`/member/products/${productId}`),

  // 7. Orders
  createOrder: (data) => api.post('/member/orders', data), // { items: [{ productId, variantId, quantity }] }
  getMyOrders: (params = {}) => api.get('/member/orders', { params }),
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

  // 3b. Update Member System Role
  updateAdminMemberRole: (userId, data) => api.patch(`/admin/members/${userId}/role`, data),

  // 3c. Membership Plans Management (Admin Authoritative)
  getAdminMembershipPlans: () => api.get('/admin/membership/plans'),
  updateAdminMembershipPlan: (planId, data) => api.patch(`/admin/membership/plans/${planId}`, data),

  // 4. Admin Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // 5. Admin Event Management (Authoritative Contract)
  getAdminEvents: (params = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.organizerId && params.organizerId !== 'all') cleanParams.organizerId = params.organizerId;
    if (params.dateFrom) cleanParams.dateFrom = params.dateFrom;
    if (params.dateTo) cleanParams.dateTo = params.dateTo;
    if (params.capacityState && params.capacityState !== 'all') cleanParams.capacityState = params.capacityState;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get('/admin/events', { params: cleanParams });
  },

  getOrganizers: () => api.get('/admin/events/organizers'),

  getAdminEvent: async (eventId) => {
    try {
      return await api.get(`/admin/events/${eventId}`);
    } catch (err) {
      // If backend returns 404 because GET /api/admin/events/:id route is absent,
      // fallback to locating the event from the admin event list
      if (err.response?.status === 404) {
        const listRes = await api.get('/admin/events');
        const found = listRes.data?.data?.events?.find((e) => String(e.id) === String(eventId));
        if (found) {
          return {
            data: {
              success: true,
              data: {
                event: found,
                ticketTypes: [],
              },
            },
          };
        }
      }
      throw err;
    }
  },

  createAdminEvent: (payload) => api.post('/admin/events', payload),

  updateAdminEvent: (eventId, payload) => api.patch(`/admin/events/${eventId}`, payload),

  updateAdminEventStatus: (eventId, status) =>
    api.patch(`/admin/events/${eventId}/status`, { status }),

  createTicketType: (eventId, payload) =>
    api.post(`/admin/events/${eventId}/ticket-types`, payload),

  updateTicketType: (eventId, ticketTypeId, payload) =>
    api.patch(`/admin/events/${eventId}/ticket-types/${ticketTypeId}`, payload),

  checkInTicket: (eventId, ticketId) =>
    api.post(`/admin/events/${eventId}/check-ins`, { ticketId }),

  getEventCheckIns: (eventId, params = {}) => {
    const cleanParams = {};
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get(`/admin/events/${eventId}/check-ins`, { params: cleanParams });
  },

  // 6. Admin Merchandise & Inventory Management
  getAdminProducts: async (params = {}, options = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.availabilityState && params.availabilityState !== 'all') {
      cleanParams.availabilityState = params.availabilityState;
    } else if (params.availability && params.availability !== 'all') {
      cleanParams.availabilityState = params.availability;
    }
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

    try {
      return await api.get('/admin/products', { params: cleanParams, signal: options.signal });
    } catch (err) {
      if (err.response?.status === 404) {
        return await api.get('/member/products', { signal: options.signal });
      }
      throw err;
    }
  },

  getAdminProduct: async (productId, options = {}) => {
    try {
      return await api.get(`/admin/products/${productId}`, { signal: options.signal });
    } catch (err) {
      if (err.response?.status === 404) {
        return await api.get(`/member/products/${productId}`, { signal: options.signal });
      }
      throw err;
    }
  },

  createAdminProduct: (payload) => api.post('/admin/products', payload),

  updateAdminProduct: (productId, payload) => api.patch(`/admin/products/${productId}`, payload),

  updateAdminProductStatus: (productId, status) =>
    api.patch(`/admin/products/${productId}/status`, { status }),

  createAdminProductVariant: (productId, payload) =>
    api.post(`/admin/products/${productId}/variants`, payload),

  updateAdminProductVariant: (productId, variantId, payload) =>
    api.patch(`/admin/products/${productId}/variants/${variantId}`, payload),

  updateAdminInventory: (productId, variantId, stock) =>
    api.patch(`/admin/products/${productId}/variants/${variantId}/inventory`, {
      stock: Number(stock),
    }),

  // 7. Admin Fundraiser Management (Frozen Contract)
  getAdminFundraisers: (params = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.dateFrom) cleanParams.dateFrom = params.dateFrom;
    if (params.dateTo) cleanParams.dateTo = params.dateTo;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get('/admin/fundraisers', { params: cleanParams });
  },

  getAdminFundraiser: (fundraiserId) => api.get(`/admin/fundraisers/${fundraiserId}`),

  createAdminFundraiser: (payload) => api.post('/admin/fundraisers', payload),

  updateAdminFundraiser: (fundraiserId, payload) =>
    api.patch(`/admin/fundraisers/${fundraiserId}`, payload),

  updateAdminFundraiserStatus: (fundraiserId, status) =>
    api.patch(`/admin/fundraisers/${fundraiserId}/status`, { status }),

  getAdminFundraiserContributions: (fundraiserId, params = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.dateFrom) cleanParams.dateFrom = params.dateFrom;
    if (params.dateTo) cleanParams.dateTo = params.dateTo;
    return api.get(`/admin/fundraisers/${fundraiserId}/contributions`, { params: cleanParams });
  },

  // 8. Admin Task & Volunteer Management (Frozen Contract)
  getAdminTasks: (params = {}, options = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.priority && params.priority !== 'all') cleanParams.priority = params.priority;
    if (params.dueDateFrom) cleanParams.dueDateFrom = params.dueDateFrom;
    if (params.dueDateTo) cleanParams.dueDateTo = params.dueDateTo;
    if (params.assignment && params.assignment !== 'ALL') cleanParams.assignment = params.assignment;
    if (params.volunteerId && params.volunteerId !== 'all') cleanParams.volunteerId = params.volunteerId;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get('/admin/tasks', { params: cleanParams, signal: options.signal });
  },

  getAdminTask: (taskId) => api.get(`/admin/tasks/${taskId}`),

  createAdminTask: (payload) => api.post('/admin/tasks', payload),

  updateAdminTask: (taskId, payload) => api.patch(`/admin/tasks/${taskId}`, payload),

  updateAdminTaskStatus: (taskId, status) =>
    api.patch(`/admin/tasks/${taskId}/status`, { status }),

  assignAdminTask: (taskId, volunteerId) =>
    api.post(`/admin/tasks/${taskId}/assignments`, { volunteerId }),

  reassignAdminTask: (taskId, assignmentId, volunteerId) =>
    api.patch(`/admin/tasks/${taskId}/assignments/${assignmentId}`, { volunteerId }),

  removeAdminTaskAssignment: (taskId, assignmentId) =>
    api.delete(`/admin/tasks/${taskId}/assignments/${assignmentId}`),

  getAdminVolunteers: (params = {}, options = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.assignment && params.assignment !== 'ALL') cleanParams.assignment = params.assignment;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get('/admin/volunteers', { params: cleanParams, signal: options.signal });
  },

  getAdminVolunteer: (volunteerId) => api.get(`/admin/volunteers/${volunteerId}`),

  getAdminVolunteerTasks: (volunteerId, params = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.priority && params.priority !== 'all') cleanParams.priority = params.priority;
    if (params.dueDateFrom) cleanParams.dueDateFrom = params.dueDateFrom;
    if (params.dueDateTo) cleanParams.dueDateTo = params.dueDateTo;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get(`/admin/volunteers/${volunteerId}/tasks`, { params: cleanParams });
  },

  // 9. Admin Finance Management (Frozen Contract P0)
  getAdminFinanceSummary: async (options = {}) => {
    try {
      return await api.get('/admin/finance', { signal: options.signal });
    } catch (err) {
      if (err.response?.status === 404) {
        // Fallback to /admin/finance/dashboard if contract endpoint /admin/finance is not mounted
        const fallback = await api.get('/admin/finance/dashboard', { signal: options.signal });
        const d = fallback.data?.data || fallback.data || {};
        return {
          ...fallback,
          data: {
            success: true,
            data: {
              summary: {
                totalIncome: d.totalIncome !== undefined ? d.totalIncome : 0,
                totalExpenses: d.totalExpenses !== undefined ? d.totalExpenses : 0,
                netBalance: d.balance !== undefined ? d.balance : ((d.totalIncome || 0) - (d.totalExpenses || 0)),
                pendingAmount: d.pendingAmount !== undefined ? d.pendingAmount : null,
                transactionCount: d.transactionCount !== undefined ? d.transactionCount : null,
              },
            },
          },
        };
      }
      throw err;
    }
  },

  getAdminFinanceTransactions: (params = {}, options = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.type && params.type !== 'all') cleanParams.type = params.type;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.direction && params.direction !== 'all') cleanParams.direction = params.direction;
    if (params.dateFrom) cleanParams.dateFrom = params.dateFrom;
    if (params.dateTo) cleanParams.dateTo = params.dateTo;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    return api.get('/admin/finance/transactions', { params: cleanParams, signal: options.signal });
  },

  getAdminFinanceTransaction: (transactionId, options = {}) =>
    api.get(`/admin/finance/transactions/${transactionId}`, { signal: options.signal }),

  // 10. Admin Announcements Management (Frozen Contract)
  getAdminAnnouncements: async (params = {}, options = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.audience && params.audience !== 'all') cleanParams.audience = params.audience;
    if (params.sortBy) cleanParams.sortBy = params.sortBy;
    if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

    try {
      return await api.get('/admin/announcements', { params: cleanParams, signal: options.signal });
    } catch (err) {
      if (err.response?.status === 404) {
        // Fallback to /member/announcements if /admin/announcements is not deployed on backend
        try {
          const fallbackRes = await api.get('/member/announcements', { signal: options.signal });
          const items = fallbackRes.data?.data?.announcements || fallbackRes.data?.data || [];
          let list = Array.isArray(items)
            ? items.map((a) => ({
                id: String(a.announcementId || a.id),
                title: a.title,
                content: a.content,
                status: 'PUBLISHED',
                audience: 'ALL_MEMBERS',
                publishedAt: a.publishedDate,
                createdAt: a.publishedDate,
                updatedAt: a.publishedDate,
              }))
            : [];

          if (cleanParams.search) {
            const q = cleanParams.search.toLowerCase();
            list = list.filter(
              (a) =>
                (a.title && a.title.toLowerCase().includes(q)) ||
                (a.content && a.content.toLowerCase().includes(q))
            );
          }

          return {
            ...fallbackRes,
            data: {
              success: true,
              data: {
                announcements: list,
                pagination: {
                  page: 1,
                  limit: 20,
                  totalItems: list.length,
                  totalPages: Math.max(1, Math.ceil(list.length / 20)),
                },
              },
            },
          };
        } catch {
          throw err;
        }
      }
      throw err;
    }
  },

  getAdminAnnouncement: async (announcementId, options = {}) => {
    try {
      return await api.get(`/admin/announcements/${announcementId}`, { signal: options.signal });
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const fallbackRes = await api.get(`/member/announcements/${announcementId}`, { signal: options.signal });
          const a = fallbackRes.data?.data?.announcement || fallbackRes.data?.data || {};
          return {
            ...fallbackRes,
            data: {
              success: true,
              data: {
                announcement: {
                  id: String(a.announcementId || a.id),
                  title: a.title,
                  content: a.content,
                  status: 'PUBLISHED',
                  audience: 'ALL_MEMBERS',
                  publishedAt: a.publishedDate,
                  createdAt: a.publishedDate,
                  updatedAt: a.publishedDate,
                },
              },
            },
          };
        } catch {
          throw err;
        }
      }
      throw err;
    }
  },

  createAdminAnnouncement: (payload) => api.post('/admin/announcements', payload),

  updateAdminAnnouncement: (announcementId, payload) =>
    api.patch(`/admin/announcements/${announcementId}`, payload),

  updateAdminAnnouncementStatus: (announcementId, status) =>
    api.patch(`/admin/announcements/${announcementId}/status`, { status }),
};

// Event Organizer Service - Complete Operations Contract
export const organizerService = {
  // GET /api/organizer/dashboard
  getDashboard: () => api.get('/organizer/dashboard'),

  // GET /api/organizer/events
  getEvents: (params = {}) => api.get('/organizer/events', { params }),

  // POST /api/organizer/events
  createEvent: (payload) => api.post('/organizer/events', payload),

  // PATCH /api/organizer/events/:id
  updateEvent: (eventId, payload) => api.patch(`/organizer/events/${eventId}`, payload),

  // PATCH /api/organizer/events/:id/status
  updateEventStatus: (eventId, status) => api.patch(`/organizer/events/${eventId}/status`, { status }),

  // GET /api/organizer/events/:id/operations
  getEventOperations: (eventId) => api.get(`/organizer/events/${eventId}/operations`),

  // Ticket Types
  getTicketTypes: (eventId) => api.get(`/organizer/events/${eventId}/ticket-types`),
  createTicketType: (eventId, payload) => api.post(`/organizer/events/${eventId}/ticket-types`, payload),
  editTicketType: (eventId, ticketTypeId, payload) =>
    api.patch(`/organizer/events/${eventId}/ticket-types/${ticketTypeId}`, payload),

  // Volunteers
  getEventVolunteers: (eventId) => api.get(`/organizer/events/${eventId}/volunteers`),
  getAvailableVolunteers: (eventId) => api.get(`/organizer/events/${eventId}/available-volunteers`),
  assignVolunteer: (eventId, volunteerId) =>
    api.post(`/organizer/events/${eventId}/volunteers`, { volunteerId }),
  removeVolunteer: (eventId, volunteerId) =>
    api.delete(`/organizer/events/${eventId}/volunteers/${volunteerId}`),

  // Check-ins
  checkInTicket: (eventId, ticketId) =>
    api.post(`/organizer/events/${eventId}/check-ins`, { ticketId }),
  getCheckIns: (eventId) => api.get(`/organizer/events/${eventId}/check-ins`),
};

// Volunteer Service - Locked Contract
export const volunteerService = {
  // GET /api/volunteer/dashboard
  getDashboard: () => api.get('/volunteer/dashboard'),

  // GET /api/volunteer/tasks
  getTasks: (params = {}) => {
    const cleanParams = {};
    if (params.page !== undefined && params.page !== null) cleanParams.page = params.page;
    if (params.limit !== undefined && params.limit !== null) cleanParams.limit = params.limit;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    return api.get('/volunteer/tasks', { params: cleanParams });
  },

  // PATCH /api/volunteer/tasks/:taskId/status
  updateTaskStatus: (taskId, status) =>
    api.patch(`/volunteer/tasks/${taskId}/status`, { status }),

  // GET /api/volunteer/tasks/:taskId
  getTaskById: (taskId) => api.get(`/volunteer/tasks/${taskId}`),
};

// Treasurer Service - Locked Contract
export const treasurerService = {
  // GET /api/treasurer/dashboard
  getDashboard: () => api.get('/treasurer/dashboard'),
};

export default api;




