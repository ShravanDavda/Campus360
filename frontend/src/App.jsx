import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtp from './pages/VerifyOtp';
import ResetPassword from './pages/ResetPassword';

// Member Dashboard Layout & Pages
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Profile from './pages/Profile';
import Membership from './pages/Membership';
import EventsList from './pages/EventsList';
import EventDetails from './pages/EventDetails';
import MyTickets from './pages/MyTickets';
import TicketDetails from './pages/TicketDetails';
import MerchandiseCatalog from './pages/MerchandiseCatalog';
import ProductDetails from './pages/ProductDetails';
import MyOrders from './pages/MyOrders';
import OrderDetails from './pages/OrderDetails';
import AnnouncementsList from './pages/AnnouncementsList';
import AnnouncementDetails from './pages/AnnouncementDetails';
import PaymentHistory from './pages/PaymentHistory';

// Admin Pages
import AdminMembers from './pages/AdminMembers';
import AdminMemberDetails from './pages/AdminMemberDetails';
import AdminEvents from './pages/AdminEvents';
import AdminEventDetails from './pages/AdminEventDetails';
import AdminMerchandise from './pages/AdminMerchandise';
import AdminProductDetails from './pages/AdminProductDetails';
import AdminFundraisers from './pages/AdminFundraisers';
import AdminFundraiserDetails from './pages/AdminFundraiserDetails';
import AdminTasks from './pages/AdminTasks';
import AdminTaskDetails from './pages/AdminTaskDetails';
import AdminVolunteers from './pages/AdminVolunteers';
import AdminVolunteerDetails from './pages/AdminVolunteerDetails';
import AdminFinance from './pages/AdminFinance';
import AdminFinanceTransactionDetails from './pages/AdminFinanceTransactionDetails';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminAnnouncementDetails from './pages/AdminAnnouncementDetails';

// Event Organizer Pages
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerEventOperations from './pages/OrganizerEventOperations';

// Volunteer Pages
import VolunteerDashboard from './pages/VolunteerDashboard';

// Treasurer Pages
import TreasurerDashboard from './pages/TreasurerDashboard';

const getStoredUserRole = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.role) return parsed.role;
    }
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const decoded = JSON.parse(atob(payloadBase64));
        if (decoded?.role) return decoded.role;
      }
    }
  } catch {
    // fallback
  }
  return null;
};

function RoleRoute({ allowedRoles, children }) {
  const role = getStoredUserRole();
  if (role && !allowedRoles.includes(role)) {
    const fallback = role === 'admin'
      ? '/admin/dashboard'
      : role === 'eventOrganizer'
        ? '/organizer/dashboard'
        : role === 'volunteer'
          ? '/volunteer/dashboard'
          : role === 'treasurer'
            ? '/treasurer/dashboard'
            : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function MemberCommerceRoute({ children }) {
  const role = getStoredUserRole();
  const operationalRoles = ['admin', 'eventOrganizer', 'volunteer', 'treasurer'];
  if (role && operationalRoles.includes(role)) {
    const fallback = role === 'admin'
      ? '/admin/dashboard'
      : role === 'eventOrganizer'
        ? '/organizer/dashboard'
        : role === 'volunteer'
          ? '/volunteer/dashboard'
          : '/treasurer/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Dashboard Layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/membership" element={<RoleRoute allowedRoles={['student']}><Membership /></RoleRoute>} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/announcements" element={<AnnouncementsList />} />
          <Route path="/announcements/:announcementId" element={<AnnouncementDetails />} />

          {/* Tickets accessible to all authenticated users */}
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/tickets/:ticketId" element={<TicketDetails />} />
          <Route path="/merchandise" element={<MemberCommerceRoute><MerchandiseCatalog /></MemberCommerceRoute>} />
          <Route path="/merchandise/:productId" element={<MemberCommerceRoute><ProductDetails /></MemberCommerceRoute>} />
          <Route path="/orders" element={<MemberCommerceRoute><MyOrders /></MemberCommerceRoute>} />
          <Route path="/orders/:orderId" element={<MemberCommerceRoute><OrderDetails /></MemberCommerceRoute>} />
          <Route path="/payments" element={<MemberCommerceRoute><PaymentHistory /></MemberCommerceRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={['admin']}><DashboardHome /></RoleRoute>} />
          <Route path="/admin/members" element={<RoleRoute allowedRoles={['admin']}><AdminMembers /></RoleRoute>} />
          <Route path="/admin/members/:userId" element={<RoleRoute allowedRoles={['admin']}><AdminMemberDetails /></RoleRoute>} />
          <Route path="/admin/events" element={<RoleRoute allowedRoles={['admin']}><AdminEvents /></RoleRoute>} />
          <Route path="/admin/events/:eventId" element={<RoleRoute allowedRoles={['admin']}><AdminEventDetails /></RoleRoute>} />
          <Route path="/admin/merchandise" element={<RoleRoute allowedRoles={['admin']}><AdminMerchandise /></RoleRoute>} />
          <Route path="/admin/merchandise/:productId" element={<RoleRoute allowedRoles={['admin']}><AdminProductDetails /></RoleRoute>} />
          <Route path="/admin/fundraisers" element={<RoleRoute allowedRoles={['admin']}><AdminFundraisers /></RoleRoute>} />
          <Route path="/admin/fundraisers/:fundraiserId" element={<RoleRoute allowedRoles={['admin']}><AdminFundraiserDetails /></RoleRoute>} />
          <Route path="/admin/tasks" element={<RoleRoute allowedRoles={['admin']}><AdminTasks /></RoleRoute>} />
          <Route path="/admin/tasks/:taskId" element={<RoleRoute allowedRoles={['admin']}><AdminTaskDetails /></RoleRoute>} />
          <Route path="/admin/volunteers" element={<RoleRoute allowedRoles={['admin']}><AdminVolunteers /></RoleRoute>} />
          <Route path="/admin/volunteers/:volunteerId" element={<RoleRoute allowedRoles={['admin']}><AdminVolunteerDetails /></RoleRoute>} />
          <Route path="/admin/finance" element={<RoleRoute allowedRoles={['admin']}><AdminFinance /></RoleRoute>} />
          <Route path="/admin/finance/transactions/:transactionId" element={<RoleRoute allowedRoles={['admin']}><AdminFinanceTransactionDetails /></RoleRoute>} />
          <Route path="/admin/announcements" element={<RoleRoute allowedRoles={['admin']}><AdminAnnouncements /></RoleRoute>} />
          <Route path="/admin/announcements/:announcementId" element={<RoleRoute allowedRoles={['admin']}><AdminAnnouncementDetails /></RoleRoute>} />

          {/* Event Organizer Routes */}
          <Route path="/organizer/dashboard" element={<RoleRoute allowedRoles={['eventOrganizer', 'admin']}><OrganizerDashboard /></RoleRoute>} />
          <Route path="/organizer/events/:eventId" element={<RoleRoute allowedRoles={['eventOrganizer', 'admin']}><OrganizerEventOperations /></RoleRoute>} />

          {/* Volunteer Routes */}
          <Route path="/volunteer/dashboard" element={<RoleRoute allowedRoles={['volunteer', 'admin']}><VolunteerDashboard /></RoleRoute>} />

          {/* Treasurer Routes */}
          <Route path="/treasurer/dashboard" element={<RoleRoute allowedRoles={['treasurer', 'admin']}><TreasurerDashboard /></RoleRoute>} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
