import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/context/AuthContext';
import { ThemeProvider } from './core/context/ThemeContext';
import { OwnerAuthProvider, useOwnerAuth } from './core/context/OwnerAuthContext';
import { StaffAuthProvider, useStaffAuth } from './core/context/StaffAuthContext';
import { PlayerAuthProvider, usePlayerAuth } from './core/context/PlayerAuthContext';

import SuperAdminLayout from './core/components/layout/SuperAdminLayout';
import OwnerLayout from './core/components/layout/OwnerLayout';
import PublicLayout from './core/components/layout/PublicLayout';
import PlayerLayout from './core/components/layout/PlayerLayout';

// Public pages
import PlayerLanding from './core/pages/public/PlayerLanding';
import BusinessLanding from './core/pages/public/BusinessLanding';
import Signup from './core/pages/public/Signup';
import BusinessPortal from './core/pages/public/BusinessPortal';
import PortalIndex from './core/pages/public/PortalIndex';
import Venues from './core/pages/public/Venues';

// Super Admin Auth pages
import SuperAdminLogin from './core/pages/superadmin/Login';
import ForgotPassword from './core/pages/superadmin/ForgotPassword';
import ResetPassword from './core/pages/superadmin/ResetPassword';

// Super Admin pages
import SuperAdminDashboard from './core/pages/superadmin/Dashboard';
import Owners from './core/pages/superadmin/Owners';
import OwnerDetail from './core/pages/superadmin/OwnerDetail';
import CreateOwner from './core/pages/superadmin/CreateOwner';
import BusinessTypes from './core/pages/superadmin/BusinessTypes';
import SubscriptionPlans from './core/pages/superadmin/SubscriptionPlans';
import Revenue from './core/pages/superadmin/Revenue';
import Tickets from './core/pages/superadmin/Tickets';
import TicketDetail from './core/pages/superadmin/TicketDetail';
import SettingsSA from './core/pages/superadmin/Settings';
import Trials from './core/pages/superadmin/Trials';
import KnowledgeBase from './core/pages/superadmin/KnowledgeBase';
import SuperAdminPlayers from './core/pages/superadmin/Players';
import Subscriptions from './core/pages/superadmin/Subscriptions';

// Owner pages
import OwnerLogin from './core/pages/owner/Login';
import OwnerDashboard from './core/pages/owner/Dashboard';
import OwnerSessions from './core/pages/owner/Sessions';
import OwnerResources from './core/pages/owner/Resources';
import OwnerCustomers from './core/pages/owner/Customers';
import OwnerPayments from './core/pages/owner/Payments';
import OwnerDues from './core/pages/owner/Dues';
import OwnerExpenses from './core/pages/owner/Expenses';
import OwnerStaff from './core/pages/owner/Staff';
import OwnerReports from './core/pages/owner/Reports';
import OwnerSettings from './core/pages/owner/Settings';
import OwnerChangePassword from './core/pages/owner/ChangePassword';
import NotificationCenter from './core/pages/owner/NotificationCenter';
import Branches from './core/pages/owner/Branches';
import ActivityLogs from './core/pages/owner/ActivityLogs';

// Staff pages
import StaffLogin from './core/pages/staff/StaffLogin';
import StaffDashboard from './core/pages/staff/StaffDashboard';
import StaffSessions from './core/pages/staff/StaffSessions';
import StaffCustomers from './core/pages/staff/StaffCustomers';
import StaffPayments from './core/pages/staff/StaffPayments';
import StaffDues from './core/pages/staff/StaffDues';
import StaffLayout from './core/components/layout/StaffLayout';

// Player Portal pages
import PlayerLogin from './core/pages/player/PlayerLogin';
import PlayerSignup from './core/pages/player/PlayerSignup';
import PlayerForgotPassword from './core/pages/player/PlayerForgotPassword';
import PlayerDashboard from './core/pages/player/PlayerDashboard';
import PlayerBookings from './core/pages/player/PlayerBookings';
import PlayerPayments from './core/pages/player/PlayerPayments';
import PlayerDues from './core/pages/player/PlayerDues';
import PlayerProfile from './core/pages/player/PlayerProfile';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return children || <Outlet />;
}

function OwnerProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useOwnerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/owner/login" replace />;
  }

  return children || <Outlet />;
}

function OwnerPublicRoute({ children }) {
  const { isAuthenticated, loading } = useOwnerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return children || <Outlet />;
}

function StaffProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useStaffAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/staff/login" replace />;
  }

  return children || <Outlet />;
}

function StaffPublicRoute({ children }) {
  const { isAuthenticated, loading } = useStaffAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return children || <Outlet />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return children || <Outlet />;
}

function PlayerPublicRoute({ children }) {
  const { isAuthenticated, loading } = usePlayerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/play/dashboard" replace />;
  }

  return children || <Outlet />;
}

function PlayerProtectedRoute({ children }) {
  const { isAuthenticated, loading } = usePlayerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/play/login" replace />;
  }

  return children || <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <OwnerAuthProvider>
            <Routes>
              {/* Player Landing Page — main homepage, has own header */}
              <Route path="/" element={<PlayerLanding />} />

              {/* Live Resource Availability — public, no auth needed, no booking */}
              <Route path="/venues" element={<Venues />} />

              {/* Business marketing pages */}
              <Route element={<PublicLayout />}>
                <Route path="/business" element={<BusinessLanding />} />
                <Route path="/signup" element={<Signup />} />
              </Route>

              {/* Business Login Portal */}
              <Route path="/portal" element={<BusinessPortal />} />
              <Route path="/auth" element={<PortalIndex />} />

              {/* Super Admin Auth routes (public) */}
              <Route path="/superadmin/login" element={<PublicRoute><SuperAdminLogin /></PublicRoute>} />
              <Route path="/superadmin/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/superadmin/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

              {/* Super Admin Protected routes */}
              <Route path="/superadmin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="owners" element={<Owners />} />
                <Route path="owner/:id" element={<OwnerDetail />} />
                <Route path="create-portal" element={<CreateOwner />} />
                <Route path="business-types" element={<BusinessTypes />} />
                <Route path="subscription-plans" element={<SubscriptionPlans />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="subscriptions" element={<Subscriptions />} />
                <Route path="trials" element={<Trials />} />
                <Route path="players" element={<SuperAdminPlayers />} />
                <Route path="knowledge-base" element={<KnowledgeBase />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="ticket/:id" element={<TicketDetail />} />
                <Route path="notifications" element={<NotificationCenter role="superadmin" backPath="/superadmin/dashboard" title="Admin Notifications" />} />
                <Route path="settings" element={<SettingsSA />} />
              </Route>

              {/* Owner Auth routes (public) */}
              <Route path="/owner/login" element={<OwnerPublicRoute><OwnerLogin /></OwnerPublicRoute>} />

              {/* Owner Protected routes */}
              <Route path="/owner" element={<OwnerProtectedRoute><OwnerLayout /></OwnerProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="sessions" element={<OwnerSessions />} />
                <Route path="resources" element={<OwnerResources />} />
                <Route path="customers" element={<OwnerCustomers />} />
                <Route path="payments" element={<OwnerPayments />} />
                <Route path="dues" element={<OwnerDues />} />
                <Route path="expenses" element={<OwnerExpenses />} />
                <Route path="staff" element={<OwnerStaff />} />
                <Route path="reports" element={<OwnerReports />} />
                <Route path="settings" element={<OwnerSettings />} />
                <Route path="branches" element={<Branches />} />
                <Route path="activity-logs" element={<ActivityLogs />} />
                <Route path="notifications" element={<NotificationCenter role="owner" backPath="/owner/dashboard" />} />
                <Route path="change-password" element={<OwnerChangePassword />} />
              </Route>

              {/* Staff routes (wrapped in single StaffAuthProvider for shared state) */}
              <Route element={<StaffAuthProvider><Outlet /></StaffAuthProvider>}>
                <Route path="/staff/login" element={<StaffPublicRoute><StaffLogin /></StaffPublicRoute>} />
                <Route path="/staff" element={<StaffProtectedRoute><StaffLayout /></StaffProtectedRoute>}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<StaffDashboard />} />
                  <Route path="sessions" element={<StaffSessions />} />
                  <Route path="customers" element={<StaffCustomers />} />
                  <Route path="payments" element={<StaffPayments />} />
                  <Route path="notifications" element={<NotificationCenter role="owner" backPath="/staff/dashboard" title="Staff Notifications" />} />
                  <Route path="dues" element={<StaffDues />} />
                </Route>
              </Route>

              {/* Player Portal routes */}
              <Route element={<PlayerAuthProvider><Outlet /></PlayerAuthProvider>}>
                <Route path="/play/login" element={<PlayerPublicRoute><PlayerLogin /></PlayerPublicRoute>} />
                <Route path="/play/signup" element={<PlayerPublicRoute><PlayerSignup /></PlayerPublicRoute>} />
                <Route path="/play/forgot-password" element={<PlayerForgotPassword />} />
                <Route path="/play" element={<PlayerProtectedRoute><PlayerLayout /></PlayerProtectedRoute>}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<PlayerDashboard />} />
                  <Route path="bookings" element={<PlayerBookings />} />
                  <Route path="payments" element={<PlayerPayments />} />
                  <Route path="dues" element={<PlayerDues />} />
                  <Route path="profile" element={<PlayerProfile />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </OwnerAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
