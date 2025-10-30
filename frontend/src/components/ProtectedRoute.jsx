import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employee) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0) {
    // Normalize role for comparison (handle both capitalized and lowercase)
    const normalizedRole = employee.role?.charAt(0).toUpperCase() + employee.role?.slice(1).toLowerCase();
    const roleMapping = {
      'admin': 'Admin',
      'planner': 'Planner',
      'supervisor': 'Supervisor',
      'technicien': 'Technician',
      'technician': 'Technician'
    };
    const mappedRole = roleMapping[employee.role?.toLowerCase()] || normalizedRole;
    const hasAccess = mappedRole === 'Admin' || allowedRoles.includes(mappedRole);
    
    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

