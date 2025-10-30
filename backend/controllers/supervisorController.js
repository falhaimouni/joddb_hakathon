const { WorkEntry, Employee, Product, Operations, Notification, Process } = require('../models');
const { Op } = require('sequelize');
const { getDashboardStats } = require('../utils/statistics');

/**
 * Check if technician has rejections on 3 consecutive days
 * @param {number} technicianId - The technician's ID
 * @param {string} currentDate - Current rejection date (YYYY-MM-DD)
 * @returns {Promise<{hasThreeConsecutive: boolean, days: string[]}>}
 */
async function checkConsecutiveRejectionDays(technicianId, currentDate) {
  // Normalize currentDate to YYYY-MM-DD format
  const normalizedCurrentDate = typeof currentDate === 'string' 
    ? currentDate.split('T')[0] 
    : new Date(currentDate).toISOString().split('T')[0];
  
  // Get all rejected entries for this technician in the last 14 days (to check for patterns)
  const fourteenDaysAgo = new Date(normalizedCurrentDate);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];
  
  const rejectedEntries = await WorkEntry.findAll({
    where: {
      technician_id: technicianId,
      status: 'rejected',
      entry_date: {
        [Op.gte]: fourteenDaysAgoStr,
        [Op.lte]: normalizedCurrentDate
      }
    },
    attributes: ['entry_date'],
    group: ['entry_date'],
    raw: true
  });
  
  // Extract unique dates, normalize them, and sort
  const rejectionDates = [...new Set(rejectedEntries.map(e => {
    const date = e.entry_date;
    return typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
  }))].sort();
  
  if (rejectionDates.length < 3) {
    return { hasThreeConsecutive: false, days: [] };
  }
  
  // Check for 3 consecutive days
  for (let i = 0; i <= rejectionDates.length - 3; i++) {
    const date1Str = rejectionDates[i];
    const date2Str = rejectionDates[i + 1];
    const date3Str = rejectionDates[i + 2];
    
    const date1 = new Date(date1Str + 'T00:00:00');
    const date2 = new Date(date2Str + 'T00:00:00');
    const date3 = new Date(date3Str + 'T00:00:00');
    
    // Calculate expected next day for each date
    const nextDay1 = new Date(date1);
    nextDay1.setDate(nextDay1.getDate() + 1);
    
    const nextDay2 = new Date(date2);
    nextDay2.setDate(nextDay2.getDate() + 1);
    
    // Check if date2 is the next day after date1, and date3 is the next day after date2
    const nextDay1Str = nextDay1.toISOString().split('T')[0];
    const nextDay2Str = nextDay2.toISOString().split('T')[0];
    const date2Str_normalized = date2.toISOString().split('T')[0];
    const date3Str_normalized = date3.toISOString().split('T')[0];
    
    if (nextDay1Str === date2Str_normalized && nextDay2Str === date3Str_normalized) {
      return {
        hasThreeConsecutive: true,
        days: [date1Str, date2Str, date3Str]
      };
    }
  }
  
  return { hasThreeConsecutive: false, days: [] };
}

/**
 * Notify all planners about consecutive rejections
 * @param {number} technicianId - The technician's ID
 * @param {string} technicianCode - The technician's employee code
 * @param {string[]} days - Array of dates with rejections
 */
async function notifyPlanners(technicianId, technicianCode, days) {
  // Get all planners
  const planners = await Employee.findAll({
    where: { role: 'Planner' },
    attributes: ['id', 'employee_code']
  });
  
  if (planners.length === 0) {
    console.log('No planners found to notify');
    return;
  }
  
  // Format dates for display
  const formattedDates = days.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }).join(', ');
  
  // Send notification to each planner
  const notifications = planners.map(planner => 
    Notification.create({
      recipient_id: planner.id,
      entry_id: null, // Not linked to a specific entry
      type: 'work_entry_status',
      title: 'Consecutive Rejection Alert',
      message: `Technician ${technicianCode} (ID: ${technicianId}) has rejected work entries on 3 consecutive days: ${formattedDates}. Please review.`
    })
  );
  
  await Promise.all(notifications);
  console.log(`Sent consecutive rejection notifications to ${planners.length} planner(s)`);
}

/**
 * Validate supervisor has access to a work entry (same department)
 * @param {Object} entry - WorkEntry instance with includes
 * @param {string} supervisorDepartment - Supervisor's department
 * @returns {Object} - {hasAccess: boolean, error?: string}
 */
async function validateDepartmentAccess(entry, supervisorDepartment) {
  // Check technician's department
  const technician = await Employee.findByPk(entry.technician_id, {
    attributes: ['id', 'department']
  });
  
  if (!technician || technician.department !== supervisorDepartment) {
    return {
      hasAccess: false,
      error: 'Access denied. This entry belongs to a technician from a different department.'
    };
  }
  
  // Check operation's process stage
  if (entry.operation_id) {
    const operation = await Operations.findByPk(entry.operation_id, {
      include: [{
        model: Process,
        as: 'process',
        attributes: ['stage']
      }]
    });
    
    if (!operation || !operation.process || operation.process.stage !== supervisorDepartment) {
      return {
        hasAccess: false,
        error: 'Access denied. This entry belongs to an operation from a different department.'
      };
    }
  }
  
  return { hasAccess: true };
}

/**
 * Get all pending work entries for review
 */
exports.getPendingEntries = async (req, res, next) => {
  try {
    const { technician_id, date } = req.query;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const whereClause = { 
      status: 'pending',
      activity_type: 'work' // Only show work entries for approval
    };
    if (technician_id) whereClause.technician_id = technician_id;
    if (date) whereClause.entry_date = date;
    
    const entries = await WorkEntry.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'technician',
          attributes: ['id', 'employee_code', 'role', 'department'],
          where: {
            department: supervisorDepartment // Filter by technician's department
          },
          required: true
        },
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name', 'status']
        },
        {
          model: Operations,
          as: 'operation',
          attributes: ['operation_id', 'operation_name', 'minimum_output_count', 'minimum_time_minutes'],
          required: true,
          include: [{
            model: Process,
            as: 'process',
            attributes: ['process_id', 'stage'],
            where: {
              stage: supervisorDepartment // Filter by operation's process stage
            },
            required: true
          }]
        }
      ],
      order: [['entry_date', 'DESC'], ['createdAt', 'DESC']]
    });
    
    res.status(200).json(entries);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all work entries (pending, approved, rejected)
 */
exports.getAllWorkEntries = async (req, res, next) => {
  try {
    const { status, technician_id, startDate, endDate } = req.query;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const whereClause = {
      activity_type: 'work' // Only show work entries (breaks/leaves are auto-approved)
    };
    if (status) whereClause.status = status;
    if (technician_id) whereClause.technician_id = technician_id;
    
    if (startDate && endDate) {
      whereClause.entry_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    const entries = await WorkEntry.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'technician',
          attributes: ['id', 'employee_code', 'role', 'department'],
          where: {
            department: supervisorDepartment // Filter by technician's department
          },
          required: true
        },
        {
          model: Employee,
          as: 'supervisor',
          attributes: ['id', 'employee_code', 'role']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name', 'status']
        },
        {
          model: Operations,
          as: 'operation',
          attributes: ['operation_id', 'operation_name'],
          required: true,
          include: [{
            model: Process,
            as: 'process',
            attributes: ['process_id', 'stage'],
            where: {
              stage: supervisorDepartment // Filter by operation's process stage
            },
            required: true
          }]
        }
      ],
      order: [['entry_date', 'DESC'], ['createdAt', 'DESC']]
    });
    
    res.status(200).json(entries);
  } catch (error) {
    next(error);
  }
};

/**
 * Get work entry by ID
 */
exports.getWorkEntryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const entry = await WorkEntry.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'technician',
          attributes: ['id', 'employee_code', 'role', 'status', 'department']
        },
        {
          model: Employee,
          as: 'supervisor',
          attributes: ['id', 'employee_code', 'role']
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operations,
          as: 'operation',
          include: [{
            model: Process,
            as: 'process',
            attributes: ['process_id', 'stage']
          }]
        }
      ]
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    // Verify department access
    if (!entry.technician || entry.technician.department !== supervisorDepartment) {
      return res.status(403).json({ 
        message: 'Access denied. This entry belongs to a different department.' 
      });
    }
    
    if (!entry.operation || !entry.operation.process || entry.operation.process.stage !== supervisorDepartment) {
      return res.status(403).json({ 
        message: 'Access denied. This entry belongs to a different department.' 
      });
    }
    
    res.status(200).json(entry);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve work entry after face-to-face review
 */
exports.approveEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const entry = await WorkEntry.findByPk(id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    // Validate department access
    const accessCheck = await validateDepartmentAccess(entry, supervisorDepartment);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.error });
    }
    
    // Allow approving entries with any status (pending, modified, rejected, or even already approved)
    await entry.update({
      status: 'approved',
      supervisor_id: req.employee.id,
      supervisor_feedback: feedback || 'Approved',
      reviewed_at: new Date()
    });
    // Notify technician
    await Notification.create({
      recipient_id: entry.technician_id,
      entry_id: entry.entry_id,
      type: 'work_entry_status',
      title: 'Work Entry Approved',
      message: `Your work entry #${entry.entry_id} was approved by supervisor.`
    });
    
    res.status(200).json({
      message: 'Work entry approved successfully',
      entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject work entry with feedback for technician to modify
 */
exports.rejectEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ 
        message: 'Feedback is required when rejecting an entry' 
      });
    }
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const entry = await WorkEntry.findByPk(id, {
      include: [{
        model: Employee,
        as: 'technician',
        attributes: ['id', 'employee_code', 'department']
      }]
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    // Validate department access
    const accessCheck = await validateDepartmentAccess(entry, supervisorDepartment);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.error });
    }
    
    // Allow rejecting entries with any status (pending, modified, approved, or even already rejected)
    await entry.update({
      status: 'rejected',
      supervisor_id: req.employee.id,
      supervisor_feedback: feedback,
      reviewed_at: new Date()
    });
    
    // Notify technician
    await Notification.create({
      recipient_id: entry.technician_id,
      entry_id: entry.entry_id,
      type: 'work_entry_status',
      title: 'Work Entry Rejected',
      message: `Your work entry #${entry.entry_id} was rejected: ${feedback}`
    });
    
    // Check for 3 consecutive days of rejections for this technician
    try {
      const rejectionCheck = await checkConsecutiveRejectionDays(
        entry.technician_id, 
        entry.entry_date
      );
      
      if (rejectionCheck.hasThreeConsecutive) {
        // Notify all planners about consecutive rejections
        await notifyPlanners(
          entry.technician_id,
          entry.technician.employee_code,
          rejectionCheck.days
        );
      }
    } catch (notificationError) {
      // Log error but don't fail the rejection if notification fails
      console.error('Error checking consecutive rejections or notifying planners:', notificationError);
    }
    
    res.status(200).json({
      message: 'Work entry rejected. Technician can now modify it.',
      entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel approval (allow technician to modify)
 */
exports.cancelApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const entry = await WorkEntry.findByPk(id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    // Validate department access
    const accessCheck = await validateDepartmentAccess(entry, supervisorDepartment);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ message: accessCheck.error });
    }
    
    if (entry.status !== 'approved') {
      return res.status(400).json({ 
        message: 'Only approved entries can be cancelled' 
      });
    }
    
    await entry.update({
      status: 'pending',
      supervisor_feedback: feedback || 'Approval cancelled.',
      reviewed_at: null
    });
    
    res.status(200).json({
      message: 'Approval cancelled. Entry status set to pending.',
      entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get supervisor dashboard with productivity statistics
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, technician_id } = req.query;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (technician_id) filters.technician_id = technician_id;
    filters.department = supervisorDepartment; // Add department filter
    
    const stats = await getDashboardStats(filters);
    
    // Get pending entries count (filtered by department)
    const pendingCount = await WorkEntry.count({
      where: { 
        status: 'pending',
        activity_type: 'work'
      },
      include: [
        {
          model: Employee,
          as: 'technician',
          where: { department: supervisorDepartment },
          required: true
        },
        {
          model: Operations,
          as: 'operation',
          required: true,
          include: [{
            model: Process,
            as: 'process',
            where: { stage: supervisorDepartment },
            required: true
          }]
        }
      ]
    });
    
    // Get entries by status (filtered by department)
    const entriesByStatus = await WorkEntry.findAll({
      where: { activity_type: 'work' },
      attributes: [
        [WorkEntry.sequelize.literal('"WorkEntry"."status"'), 'status'],
        [WorkEntry.sequelize.fn('COUNT', WorkEntry.sequelize.literal('"WorkEntry"."entry_id"')), 'count']
      ],
      include: [
        {
          model: Employee,
          as: 'technician',
          where: { department: supervisorDepartment },
          required: true,
          attributes: [] // No attributes needed for grouping
        },
        {
          model: Operations,
          as: 'operation',
          required: true,
          attributes: [], // No attributes needed for grouping
          include: [{
            model: Process,
            as: 'process',
            where: { stage: supervisorDepartment },
            required: true,
            attributes: [] // No attributes needed for grouping
          }]
        }
      ],
      group: [WorkEntry.sequelize.literal('"WorkEntry"."status"')],
      raw: true
    });
    
    // Get top performing technicians (filtered by department)
    // First, get operation IDs for supervisor's department
    const processesInDept = await Process.findAll({
      where: { stage: supervisorDepartment },
      attributes: ['process_id'],
      raw: true
    });
    const processIds = processesInDept.map(p => p.process_id);

    const topTechniciansWhereClause = {
      status: 'approved',
      activity_type: 'work'
    };

    if (processIds.length > 0) {
      const operationsInDept = await Operations.findAll({
        where: { process_id: { [Op.in]: processIds } },
        attributes: ['operation_id'],
        raw: true
      });
      const operationIds = operationsInDept.map(op => op.operation_id);
      
      if (operationIds.length > 0) {
        topTechniciansWhereClause.operation_id = { [Op.in]: operationIds };
      } else {
        topTechniciansWhereClause.operation_id = { [Op.in]: [] }; // No operations, no entries
      }
    } else {
      topTechniciansWhereClause.operation_id = { [Op.in]: [] }; // No processes, no operations
    }

    // Get technician IDs from supervisor's department
    const techniciansInDept = await Employee.findAll({
      where: { department: supervisorDepartment, role: 'Technician' },
      attributes: ['id'],
      raw: true
    });
    const technicianIds = techniciansInDept.map(t => t.id);

    if (technicianIds.length > 0) {
      topTechniciansWhereClause.technician_id = { [Op.in]: technicianIds };
    } else {
      topTechniciansWhereClause.technician_id = { [Op.in]: [] }; // No technicians, no entries
    }

    const topTechnicians = await WorkEntry.findAll({
      where: topTechniciansWhereClause,
      attributes: [
        'technician_id',
        [WorkEntry.sequelize.fn('COUNT', WorkEntry.sequelize.literal('"WorkEntry"."entry_id"')), 'entries_count'],
        [WorkEntry.sequelize.fn('SUM', WorkEntry.sequelize.literal('"WorkEntry"."operation_count"')), 'total_output']
      ],
      group: [WorkEntry.sequelize.literal('"WorkEntry"."technician_id"')],
      order: [[WorkEntry.sequelize.literal('total_output'), 'DESC']],
      limit: 10,
      raw: true
    });

    // Now fetch technician details separately for the results
    const topTechnicianIds = topTechnicians.map(t => t.technician_id).filter(id => id !== null);
    let topTechniciansWithDetails = [];
    
    if (topTechnicianIds.length > 0) {
      const technicians = await Employee.findAll({
        where: {
          id: { [Op.in]: topTechnicianIds },
          department: supervisorDepartment,
          role: 'Technician'
        },
        attributes: ['id', 'employee_code', 'department'],
        raw: true
      });

      // Combine the results
      const techniciansMap = {};
      technicians.forEach(tech => {
        techniciansMap[tech.id] = tech;
      });

      topTechniciansWithDetails = topTechnicians.map(entry => ({
        ...entry,
        technician: techniciansMap[entry.technician_id] || null
      }));
    }
    
    res.status(200).json({
      statistics: stats,
      pendingCount,
      entriesByStatus,
      topTechnicians: topTechniciansWithDetails,
      generatedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get technician performance summary
 */
exports.getTechnicianPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // Check supervisor has department
    if (!req.employee.department) {
      return res.status(403).json({ 
        message: 'Supervisor must have a department assigned' 
      });
    }
    
    const supervisorDepartment = req.employee.department;
    
    const technician = await Employee.findByPk(id, {
      attributes: ['id', 'employee_code', 'role', 'status', 'department']
    });
    
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    
    // Verify technician belongs to supervisor's department
    if (technician.department !== supervisorDepartment) {
      return res.status(403).json({ 
        message: 'Access denied. This technician belongs to a different department.' 
      });
    }
    
    // Get operation IDs for supervisor's department
    const processesInDept = await Process.findAll({
      where: { stage: supervisorDepartment },
      attributes: ['process_id'],
      raw: true
    });
    const processIds = processesInDept.map(p => p.process_id);
    
    if (processIds.length === 0) {
      return res.status(200).json({
        technician: {
          id: technician.id,
          employee_code: technician.employee_code,
          department: technician.department
        },
        total_entries: 0,
        total_output: 0,
        total_time_minutes: 0,
        average_output_per_entry: 0,
        period: { startDate: startDate || null, endDate: endDate || null },
        generatedAt: new Date()
      });
    }
    
    const operationsInDept = await Operations.findAll({
      where: { process_id: { [Op.in]: processIds } },
      attributes: ['operation_id'],
      raw: true
    });
    const operationIds = operationsInDept.map(op => op.operation_id);
    
    const whereClause = {
      technician_id: id,
      status: 'approved',
      activity_type: 'work'
    };
    
    if (operationIds.length > 0) {
      whereClause.operation_id = { [Op.in]: operationIds };
    } else {
      whereClause.operation_id = { [Op.in]: [] }; // No operations, no entries
    }
    
    if (startDate && endDate) {
      whereClause.entry_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    const entries = await WorkEntry.findAll({
      where: whereClause,
      attributes: [
        [WorkEntry.sequelize.fn('COUNT', WorkEntry.sequelize.col('entry_id')), 'total_entries'],
        [WorkEntry.sequelize.fn('SUM', WorkEntry.sequelize.col('operation_count')), 'total_output'],
        [WorkEntry.sequelize.fn('SUM', WorkEntry.sequelize.col('duration_minutes')), 'total_time_minutes']
      ],
      raw: true
    });
    
    const result = entries[0] || {
      total_entries: '0',
      total_output: '0',
      total_time_minutes: '0'
    };
    
    const totalEntries = parseInt(result.total_entries || 0);
    const totalOutput = parseInt(result.total_output || 0);
    const totalTimeMinutes = parseInt(result.total_time_minutes || 0);
    const averageOutputPerEntry = totalEntries > 0 ? (totalOutput / totalEntries).toFixed(2) : 0;
    
    res.status(200).json({
      technician: {
        id: technician.id,
        employee_code: technician.employee_code,
        department: technician.department
      },
      total_entries: totalEntries,
      total_output: totalOutput,
      total_time_minutes: totalTimeMinutes,
      average_output_per_entry: parseFloat(averageOutputPerEntry),
      period: { startDate: startDate || null, endDate: endDate || null },
      generatedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
};

