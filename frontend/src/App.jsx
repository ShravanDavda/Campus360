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

        {/* Protected Common Member Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/tickets/:ticketId" element={<TicketDetails />} />
          <Route path="/merchandise" element={<MerchandiseCatalog />} />
          <Route path="/merchandise/:productId" element={<ProductDetails />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/orders/:orderId" element={<OrderDetails />} />
          <Route path="/announcements" element={<AnnouncementsList />} />
          <Route path="/announcements/:announcementId" element={<AnnouncementDetails />} />
          <Route path="/payments" element={<PaymentHistory />} />

          {/* Admin Member Management Routes */}
          <Route path="/admin/members" element={<AdminMembers />} />
          <Route path="/admin/members/:userId" element={<AdminMemberDetails />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
