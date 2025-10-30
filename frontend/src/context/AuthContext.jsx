import { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedEmployee = localStorage.getItem('employee');
      
      if (token && storedEmployee) {
        try {
          // Set employee from storage first for immediate UI
          setEmployee(JSON.parse(storedEmployee));
          
          // Verify token is still valid by fetching profile
          const response = await api.get('/employees/profile');
          // Normalize role from backend format (lowercase) to frontend format (capitalized)
          const roleMapping = {
            'admin': 'Admin',
            'planner': 'Planner',
            'supervisor': 'Supervisor',
            'technicien': 'Technician',
            'technician': 'Technician'
          };
          const employeeData = response.data.employee;
          const normalizedEmployee = {
            ...employeeData,
            role: roleMapping[employeeData.role?.toLowerCase()] || employeeData.role
          };
          setEmployee(normalizedEmployee);
          localStorage.setItem('employee', JSON.stringify(normalizedEmployee));
        } catch (error) {
          // Token is invalid or expired, clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('employee');
          localStorage.removeItem('employeeId');
          setEmployee(null);
        }
      } else {
        // Clean up old auth method (employeeId)
        localStorage.removeItem('employeeId');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (employeeCode, password) => {
    try {
      const response = await api.post('/employees/login', {
        username: employeeCode,
        password: password,
      });

      const { token, employee } = response.data;
      
      // Normalize role from backend format (lowercase) to frontend format (capitalized)
      const roleMapping = {
        'admin': 'Admin',
        'planner': 'Planner',
        'supervisor': 'Supervisor',
        'technicien': 'Technician',
        'technician': 'Technician'
      };
      const normalizedEmployee = {
        ...employee,
        role: roleMapping[employee.role?.toLowerCase()] || employee.role
      };
      
      // Save token and employee data
      localStorage.setItem('token', token);
      localStorage.setItem('employee', JSON.stringify(normalizedEmployee));
      
      // Clean up old auth method if exists
      localStorage.removeItem('employeeId');
      
      setEmployee(normalizedEmployee);
      return { success: true, employee: normalizedEmployee, token };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول',
      };
    }
  };

  const logout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('employee');
    localStorage.removeItem('employeeId');
    setEmployee(null);
  };

  const hasRole = (role) => {
    if (!employee) return false;
    return employee.role === role || employee.role === 'Admin';
  };

  const hasAnyRole = (roles) => {
    if (!employee) return false;
    if (employee.role === 'Admin') return true;
    return roles.includes(employee.role);
  };

  const value = {
    employee,
    loading,
    login,
    logout,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

