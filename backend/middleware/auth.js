const { Employee, Department } = require('../models');
const { verifyToken, getTokenFromRequest } = require('../utils/jwt');

// Middleware to authenticate user using JWT in Authorization header
const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const employee = await Employee.findByPk(decoded.id, { 
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.employee = employee;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

// Middleware to check role-based access
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (allowedRoles.includes(req.employee.role)) {
      next();
    }
    else {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
  };
};

// Middleware for Admin only
const adminOnly = authorize('admin');

// Middleware for Planner and Admin
const plannerOrAdmin = authorize('admin', 'planner');

// Middleware for Supervisor and Admin
const supervisorOrAdmin = authorize('admin', 'supervisor');

// Middleware for Technician and above  
const technicianOrAbove = authorize('admin', 'planner', 'supervisor', 'technicien');

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  plannerOrAdmin,
  supervisorOrAdmin,
  technicianOrAbove
};

