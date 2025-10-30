const { WorkEntry, Employee, Product, Operations, Process, sequelize } = require('../models');
const { Op } = require('sequelize');

// Constants
const WORK_HOURS_PER_DAY = 8; // 9 hours - 1 hour break
const WORK_MINUTES_PER_DAY = WORK_HOURS_PER_DAY * 60;

/**
 * Calculate productivity for a given period
 * Productivity = (Actual Output / Target Output) * 100
 */
const calculateProductivity = async (filters = {}) => {
  try {
    const whereClause = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.entry_date = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    }
    
    if (filters.technician_id) {
      whereClause.technician_id = filters.technician_id;
    }
    
    if (filters.product_id) {
      whereClause.product_id = filters.product_id;
    }
    
    whereClause.status = 'approved'; // Only count approved entries
    whereClause.activity_type = 'work'; // Only work entries
    
    // Build includes with department filtering if provided
    const includeClause = [];
    
    if (filters.department) {
      // Filter by technician department
      includeClause.push({
        model: Employee,
        as: 'technician',
        where: { department: filters.department },
        required: true,
        attributes: ['id', 'employee_code', 'department']
      });
    }
    
    // Add operation include with process filtering
    const operationInclude = {
      model: Operations,
      as: 'operation',
      attributes: ['operation_id', 'operation_name', 'minimum_output_count'],
      required: true
    };
    
    if (filters.department) {
      // Filter by operation's process stage (department)
      operationInclude.include = [{
        model: Process,
        as: 'process',
        where: { stage: filters.department },
        required: true,
        attributes: ['process_id', 'stage']
      }];
    }
    
    includeClause.push(operationInclude);
    
    const entries = await WorkEntry.findAll({
      where: whereClause,
      include: includeClause
    });
    
    let totalActualOutput = 0;
    let totalTargetOutput = 0;
    
    entries.forEach(entry => {
      totalActualOutput += entry.operation_count;
      totalTargetOutput += entry.operation.minimum_output_count;
    });
    
    const productivity = totalTargetOutput > 0 
      ? ((totalActualOutput / totalTargetOutput) * 100).toFixed(2)
      : 0;
    
    return {
      productivity: parseFloat(productivity),
      totalActualOutput,
      totalTargetOutput,
      entriesCount: entries.length
    };
  } catch (error) {
    throw new Error(`Error calculating productivity: ${error.message}`);
  }
};

/**
 * Calculate efficiency for a given period
 * Efficiency = (Standard Time / Actual Time) * 100
 */
const calculateEfficiency = async (filters = {}) => {
  try {
    const whereClause = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.entry_date = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    }
    
    if (filters.technician_id) {
      whereClause.technician_id = filters.technician_id;
    }
    
    if (filters.product_id) {
      whereClause.product_id = filters.product_id;
    }
    
    whereClause.status = 'approved';
    whereClause.activity_type = 'work'; // Only work entries
    
    // Build includes with department filtering if provided
    const includeClause = [];
    
    if (filters.department) {
      // Filter by technician department
      includeClause.push({
        model: Employee,
        as: 'technician',
        where: { department: filters.department },
        required: true,
        attributes: ['id', 'employee_code', 'department']
      });
    }
    
    // Add operation include with process filtering
    const operationInclude = {
      model: Operations,
      as: 'operation',
      attributes: ['operation_id', 'operation_name', 'minimum_time_minutes'],
      required: true
    };
    
    if (filters.department) {
      // Filter by operation's process stage (department)
      operationInclude.include = [{
        model: Process,
        as: 'process',
        where: { stage: filters.department },
        required: true,
        attributes: ['process_id', 'stage']
      }];
    }
    
    includeClause.push(operationInclude);
    
    const entries = await WorkEntry.findAll({
      where: whereClause,
      include: includeClause
    });
    
    let totalStandardTime = 0;
    let totalActualTime = 0;
    
    entries.forEach(entry => {
      totalStandardTime += entry.operation.minimum_time_minutes * entry.operation_count;
      totalActualTime += entry.duration_minutes;
    });
    
    const efficiency = totalActualTime > 0 
      ? ((totalStandardTime / totalActualTime) * 100).toFixed(2)
      : 0;
    
    return {
      efficiency: parseFloat(efficiency),
      totalStandardTime,
      totalActualTime,
      entriesCount: entries.length
    };
  } catch (error) {
    throw new Error(`Error calculating efficiency: ${error.message}`);
  }
};

/**
 * Calculate utilization for a given period
 * Utilization = (Productive Time / Available Time) * 100
 */
const calculateUtilization = async (filters = {}) => {
  try {
    const whereClause = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.entry_date = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    }
    
    if (filters.technician_id) {
      whereClause.technician_id = filters.technician_id;
    }
    
    whereClause.status = 'approved';
    whereClause.activity_type = 'work'; // Only work entries
    
    // For department filtering, we need to filter at the WHERE level using subqueries
    // instead of JOINs to avoid GROUP BY issues
    if (filters.department) {
      // Get technician IDs from the department
      const techniciansInDept = await Employee.findAll({
        where: { department: filters.department, role: 'Technician' },
        attributes: ['id'],
        raw: true
      });
      const technicianIds = techniciansInDept.map(t => t.id);
      
      if (technicianIds.length === 0) {
        // No technicians in this department, return empty result
        return {
          utilization: 0,
          totalProductiveTime: 0,
          totalAvailableTime: 0,
          workDays: 0
        };
      }
      
      // Get process IDs for this department
      const processesInDept = await Process.findAll({
        where: { stage: filters.department },
        attributes: ['process_id'],
        raw: true
      });
      const processIds = processesInDept.map(p => p.process_id);
      
      if (processIds.length === 0) {
        // No processes for this department, return empty result
        return {
          utilization: 0,
          totalProductiveTime: 0,
          totalAvailableTime: 0,
          workDays: 0
        };
      }
      
      // Get operation IDs for these processes
      const operationsInDept = await Operations.findAll({
        where: { process_id: { [Op.in]: processIds } },
        attributes: ['operation_id'],
        raw: true
      });
      const operationIds = operationsInDept.map(op => op.operation_id);
      
      // Filter work entries by technician and operation
      if (whereClause.technician_id) {
        // If technician_id filter exists, ensure it's in the department list
        if (technicianIds.includes(whereClause.technician_id)) {
          whereClause.technician_id = { [Op.in]: [whereClause.technician_id] };
        } else {
          whereClause.technician_id = { [Op.in]: [] }; // No match, no results
        }
      } else {
        whereClause.technician_id = { [Op.in]: technicianIds };
      }
      
      if (operationIds.length > 0) {
        whereClause.operation_id = { [Op.in]: operationIds };
      } else {
        whereClause.operation_id = { [Op.in]: [] }; // No operations, no entries
      }
    }
    
    // Get total productive time (no includes to avoid GROUP BY issues)
    const entries = await WorkEntry.findAll({
      where: whereClause,
      attributes: [
        'technician_id',
        'entry_date',
        [sequelize.fn('SUM', sequelize.col('duration_minutes')), 'total_minutes']
      ],
      group: ['technician_id', 'entry_date'],
      raw: true
    });
    
    // Calculate available time (work days * work hours per day)
    // WORK_MINUTES_PER_DAY = 480 minutes (8 hours) - break hours already excluded
    const workDays = entries.length || 1;
    const totalAvailableTime = workDays * WORK_MINUTES_PER_DAY;
    
    // Sum productive time
    const totalProductiveTime = entries.reduce((sum, entry) => {
      return sum + parseFloat(entry.total_minutes || 0);
    }, 0);
    
    // Calculate utilization: Productive Time / Available Time (8 hours per day)
    // Break hours are NOT included in calculation
    const utilization = totalAvailableTime > 0 
      ? ((totalProductiveTime / totalAvailableTime) * 100).toFixed(2)
      : 0;
    
    return {
      utilization: parseFloat(utilization),
      totalProductiveTime,
      totalAvailableTime,
      workDays
    };
  } catch (error) {
    throw new Error(`Error calculating utilization: ${error.message}`);
  }
};

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = async (filters = {}) => {
  try {
    const [productivity, efficiency, utilization] = await Promise.all([
      calculateProductivity(filters),
      calculateEfficiency(filters),
      calculateUtilization(filters)
    ]);
    
    return {
      productivity,
      efficiency,
      utilization,
      filters,
      generatedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Error generating dashboard stats: ${error.message}`);
  }
};

/**
 * Get job order progress
 */
const getJobOrderProgress = async (jobOrderId) => {
  try {
    const { JobOrder } = require('../models');
    
    const jobOrder = await JobOrder.findByPk(jobOrderId, {
      include: [
        {
          model: Product,
          as: 'product'
        }
      ]
    });
    
    if (!jobOrder) {
      throw new Error('Job order not found');
    }
    
    const progressPercentage = jobOrder.target_quantity > 0
      ? ((jobOrder.completed_quantity / jobOrder.target_quantity) * 100).toFixed(2)
      : 0;
    
    return {
      jobOrderId: jobOrder.job_order_id,
      orderNumber: jobOrder.order_number,
      targetQuantity: jobOrder.target_quantity,
      completedQuantity: jobOrder.completed_quantity,
      remainingQuantity: jobOrder.target_quantity - jobOrder.completed_quantity,
      progressPercentage: parseFloat(progressPercentage),
      status: jobOrder.status,
      product: jobOrder.product
    };
  } catch (error) {
    throw new Error(`Error calculating job order progress: ${error.message}`);
  }
};

module.exports = {
  calculateProductivity,
  calculateEfficiency,
  calculateUtilization,
  getDashboardStats,
  getJobOrderProgress
};

