import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// Admin Pages
import UsersManagement from './pages/admin/UsersManagement';
import Statistics from './pages/admin/Statistics';
import Analytics from './pages/admin/Analytics';

// Planner Pages
import Products from './pages/planner/Products';
import Operations from './pages/planner/Operations';
import JobOrders from './pages/planner/JobOrders';
import PlannerDashboard from './pages/planner/Dashboard';

// Supervisor Pages
import Pending from './pages/supervisor/Pending';
import SupervisorDashboard from './pages/supervisor/Dashboard';

// Technician Pages
import WorkEntries from './pages/technician/WorkEntries';
import History from './pages/technician/History';
// Technician has a single page only (WorkEntries)

const AppRoutes = () => {
  const { employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={employee ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <UsersManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Products />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/operations"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Operations />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/statistics"
        element={
          <ProtectedRoute allowedRoles={['Planner', 'Admin']}>
            <Layout>
              <Statistics />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['Planner', 'Admin']}>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Planner Routes */}
      <Route
        path="/planner/products"
        element={
          <ProtectedRoute allowedRoles={['Planner', 'Admin']}>
            <Layout>
              <Products />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/planner/operations"
        element={
          <ProtectedRoute allowedRoles={['Planner', 'Admin']}>
            <Layout>
              <Operations />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/planner/job-orders"
        element={
          <ProtectedRoute allowedRoles={['Planner', 'Admin']}>
            <Layout>
              <JobOrders />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/planner/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Planner', 'Admin']}>
            <Layout>
              <PlannerDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Supervisor Routes */}
      <Route
        path="/supervisor/pending"
        element={
          <ProtectedRoute allowedRoles={['Supervisor', 'Admin']}>
            <Layout>
              <Pending />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Supervisor', 'Admin']}>
            <Layout>
              <SupervisorDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Technician Routes */}
      <Route
        path="/technician/work-entries"
        element={
          <ProtectedRoute allowedRoles={['Technician', 'Supervisor', 'Planner', 'Admin']}>
            <Layout>
              <WorkEntries />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/technician/history"
        element={
          <ProtectedRoute allowedRoles={['Technician', 'Supervisor', 'Planner', 'Admin']}>
            <Layout>
              <History />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/** Technician-only page retained: /technician/work-entries */}

      {/* Default redirect based on role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              {employee?.role === 'Admin' ? (
                <Navigate to="/admin/users" replace />
              ) : employee?.role === 'Planner' ? (
                <Navigate to="/planner/products" replace />
              ) : employee?.role === 'Supervisor' ? (
                <Navigate to="/supervisor/pending" replace />
              ) : employee?.role === 'Technician' ? (
                <Navigate to="/technician/work-entries" replace />
              ) : (
                <Navigate to="/login" replace />
              )}
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
