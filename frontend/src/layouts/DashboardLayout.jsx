import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  User,
  CreditCard,
  Calendar,
  Ticket,
  ShoppingBag,
  Package,
  Megaphone,
  Receipt,
  Users,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  CheckSquare,
  UserCheck,
} from 'lucide-react';

const MEMBER_NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Membership', path: '/membership', icon: CreditCard },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'My Tickets', path: '/tickets', icon: Ticket },
  { name: 'Merchandise', path: '/merchandise', icon: ShoppingBag },
  { name: 'My Orders', path: '/orders', icon: Package },
  { name: 'Announcements', path: '/announcements', icon: Megaphone },
  { name: 'Payments', path: '/payments', icon: Receipt },
];

const getUserRole = () => {
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

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRole = getUserRole();
  let navItems = MEMBER_NAV_ITEMS;

  if (userRole === 'admin') {
    navItems = [
      { name: 'Admin Panel', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Admin Members', path: '/admin/members', icon: Users },
      { name: 'Admin Events', path: '/admin/events', icon: Calendar },
      { name: 'Admin Merchandise', path: '/admin/merchandise', icon: ShoppingBag },
      { name: 'Admin Fundraisers', path: '/admin/fundraisers', icon: HeartHandshake },
      { name: 'Admin Tasks', path: '/admin/tasks', icon: CheckSquare },
      { name: 'Admin Volunteers', path: '/admin/volunteers', icon: UserCheck },
      { name: 'Admin Finance', path: '/admin/finance', icon: Receipt },
      { name: 'Admin Announcements', path: '/admin/announcements', icon: Megaphone },
      { name: 'Profile', path: '/profile', icon: User },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
    ];
  } else if (userRole === 'eventOrganizer') {
    navItems = [
      { name: 'Event Organizer Panel', path: '/organizer/dashboard', icon: LayoutDashboard },
      { name: 'Profile', path: '/profile', icon: User },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
    ];
  } else if (userRole === 'treasurer') {
    navItems = [
      { name: 'Treasurer Panel', path: '/treasurer/dashboard', icon: LayoutDashboard },
      { name: 'Profile', path: '/profile', icon: User },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
    ];
  } else if (userRole === 'volunteer') {
    navItems = [
      { name: 'Volunteer Panel', path: '/volunteer/dashboard', icon: LayoutDashboard },
      { name: 'Profile', path: '/profile', icon: User },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
    ];
  }

  React.useEffect(() => {
    const handlePageShow = () => {
      const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!currentToken) {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e2e5e9] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#714B67]/10 text-[#714B67] text-xs font-semibold tracking-wider uppercase">
                <ShieldCheck className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
                <span>CAMPUS360</span>
              </div>
              <span className="hidden sm:inline-block text-sm font-semibold text-[#000000]">
                LDCE Student Association
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-[#714B67] hover:bg-gray-100 rounded border border-[#e2e5e9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-60 shrink-0">
          <nav className="sticky top-24 bg-white border border-[#e2e5e9] rounded-lg p-2 space-y-1 shadow-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => {
                    const active = isActive || (item.path === '/admin/dashboard' && location.pathname === '/dashboard');
                    return `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded transition-colors ${active
                      ? 'bg-[#714B67] text-white shadow-sm'
                      : 'text-gray-700 hover:bg-[#714B67]/10 hover:text-[#714B67]'
                      }`;
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-none"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-[#e2e5e9] py-4 px-3 shadow-xl">
              <div className="flex items-center justify-between px-2 mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#714B67]/10 text-[#714B67] text-xs font-semibold uppercase">
                  <ShieldCheck className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
                  <span>CAMPUS360</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-gray-500 hover:text-gray-900"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => {
                        const active = isActive || (item.path === '/admin/dashboard' && location.pathname === '/dashboard');
                        return `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded transition-colors ${active
                          ? 'bg-[#714B67] text-white shadow-sm'
                          : 'text-gray-700 hover:bg-[#714B67]/10 hover:text-[#714B67]'
                          }`;
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e5e9] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[#8F8F8F]">
          <p>Odoo × LDCE Hackathon 2026 — LDCE Student Association</p>
        </div>
      </footer>
    </div>
  );
}
