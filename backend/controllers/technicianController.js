const { WorkEntry, Product, Operations, Employee, Process } = require('../models');
const { Op } = require('sequelize');

/**
 * Create work entry (product ID, operation count, start/end -> duration)
 */
function diffMinutes(hhmmStart, hhmmEnd) {
  const [sh, sm] = (hhmmStart || '').split(':').map(Number);
  const [eh, em] = (hhmmEnd || '').split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) {
    throw new Error('start_time and end_time must be HH:MM (24h)');
  }
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (end < start) throw new Error('End time must be after start time');
  return end - start;
}

/**
 * Convert HH:MM time string to minutes (for overlap checking)
 */
function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error('Time must be in HH:MM format');
  }
  return h * 60 + m;
}

/**
 * Check if two time ranges overlap
 * @param {string} start1 - First range start time (HH:MM)
 * @param {string} end1 - First range end time (HH:MM)
 * @param {string} start2 - Second range start time (HH:MM)
 * @param {string} end2 - Second range end time (HH:MM)
 * @returns {boolean} - True if ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  // Two ranges overlap if: start1 < end2 AND start2 < end1
  // Note: We use strict < so that adjacent times (e.g., 10:00-11:00 and 11:00-12:00) don't overlap
  return s1 < e2 && s2 < e1;
}

/**
 * Create unified time entry (work, break, or leave)
 */
exports.createTimeEntry = async (req, res, next) => {
  try {
    const {
      activity_type,
      start_time,
      end_time,
      entry_date,
      // Work fields (only required if activity_type === 'work')
      product_id,
      operation_id,
      operation_count
    } = req.body;
    
    // Validate activity_type
    if (!activity_type || !['work', 'break', 'leave', 'waiting', 'other'].includes(activity_type)) {
      return res.status(400).json({ 
        message: 'activity_type is required and must be: work, break, leave, waiting, or other' 
      });
    }
    
    // Validate time fields for all types
    if (!start_time || !end_time) {
      return res.status(400).json({ 
        message: 'start_time and end_time are required for all activity types' 
      });
    }
    
    // Validate work fields only if activity_type is 'work'
    if (activity_type === 'work') {
      if (!product_id || !operation_id || !operation_count) {
        return res.status(400).json({ 
          message: 'For work entries: product_id, operation_id, and operation_count are required' 
        });
      }
      
      // Verify product exists
      const product = await Product.findByPk(product_id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Verify operation exists and get its process
      const operation = await Operations.findByPk(operation_id, {
        include: [{
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage']
        }]
      });
      
      if (!operation) {
        return res.status(404).json({ message: 'Operation not found' });
      }
      
      if (!operation.process) {
        return res.status(404).json({ message: 'Operation process not found' });
      }
      
      // Validate technician's department matches operation's process stage
      if (!req.employee.department) {
        return res.status(400).json({ 
          message: 'Technician must have a department assigned to create work entries' 
        });
      }
      
      if (req.employee.department !== operation.process.stage) {
        return res.status(403).json({ 
          message: `Access denied. You (${req.employee.department} department) cannot work on ${operation.process.stage} operations. Please use operations from your department (${req.employee.department}).` 
        });
      }
    }
    
    // Compute duration
    const duration_minutes = diffMinutes(start_time, end_time);

    // Check for overlapping entries on the same date
    const targetDate = entry_date || new Date().toISOString().split('T')[0];
    const existingEntries = await WorkEntry.findAll({
      where: {
        technician_id: req.employee.id,
        entry_date: targetDate
      },
      attributes: ['entry_id', 'start_time', 'end_time']
    });

    // Check if new entry overlaps with any existing entry
    for (const existing of existingEntries) {
      if (timesOverlap(start_time, end_time, existing.start_time, existing.end_time)) {
        return res.status(400).json({
          message: `Time entry overlaps with existing entry #${existing.entry_id} (${existing.start_time} - ${existing.end_time}). Please adjust your times.`
        });
      }
    }

    // Create unified time entry
    const timeEntry = await WorkEntry.create({
      technician_id: req.employee.id,
      activity_type,
      start_time,
      end_time,
      duration_minutes,
      entry_date: entry_date || new Date(),
      // Work fields (only set if work type)
      product_id: activity_type === 'work' ? product_id : null,
      operation_id: activity_type === 'work' ? operation_id : null,
      operation_count: activity_type === 'work' ? operation_count : null,
      // Status: pending for work (needs approval), approved for break/leave/waiting (auto-approved)
      status: activity_type === 'work' ? 'pending' : 'approved'
    });
    
    const responseMessage = activity_type === 'work' 
      ? 'Work entry created successfully. Awaiting supervisor approval.'
      : `${activity_type.charAt(0).toUpperCase() + activity_type.slice(1)} entry created successfully.`;
    
    res.status(201).json({
      message: responseMessage,
      timeEntry
    });
  } catch (error) {
    next(error);
  }
};

// Keep old function for backward compatibility
exports.createWorkEntry = exports.createTimeEntry;

/**
 * Create multiple time entries in bulk (submit whole day at once)
 */
exports.createTimeEntriesBulk = async (req, res, next) => {
  const t = await WorkEntry.sequelize.transaction();
  try {
    const { entry_date, entries } = req.body;

    if (!entry_date) {
      await t.rollback();
      return res.status(400).json({ message: 'entry_date is required' });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'entries must be a non-empty array' });
    }

    // Step 1: Validate all entries format and requirements
    const validatedEntries = [];
    const validationErrors = [];

    for (let i = 0; i < entries.length; i++) {
      const entryData = entries[i];
      const index = i + 1;

      try {
        const {
          activity_type,
          start_time,
          end_time,
          product_id,
          operation_id,
          operation_count
        } = entryData;

        // Validate activity_type
        if (!activity_type || !['work', 'break', 'leave', 'waiting', 'other'].includes(activity_type)) {
          throw new Error(`activity_type must be 'work', 'break', 'leave', 'waiting', or 'other'`);
        }

        // Validate time fields
        if (!start_time || !end_time) {
          throw new Error(`start_time and end_time are required`);
        }

        // Validate and compute duration
        const duration_minutes = diffMinutes(start_time, end_time);

        // Validate work fields only if activity_type is 'work'
        if (activity_type === 'work') {
          if (!product_id || !operation_id || operation_count === undefined) {
            throw new Error(`For work entries, product_id, operation_id, and operation_count are required`);
          }

          // Verify product exists
          const product = await Product.findByPk(product_id);
          if (!product) {
            throw new Error(`Product with ID ${product_id} not found`);
          }

          // Verify operation exists and get its process
          const operation = await Operations.findByPk(operation_id, {
            include: [{
              model: Process,
              as: 'process',
              attributes: ['process_id', 'stage']
            }]
          });
          
          if (!operation) {
            throw new Error(`Operation with ID ${operation_id} not found`);
          }
          
          if (!operation.process) {
            throw new Error(`Operation process not found for operation ${operation_id}`);
          }
          
          // Validate technician's department matches operation's process stage
          if (!req.employee.department) {
            throw new Error(`Technician must have a department assigned to create work entries`);
          }
          
          if (req.employee.department !== operation.process.stage) {
            throw new Error(`Access denied. You (${req.employee.department} department) cannot work on ${operation.process.stage} operations. Please use operations from your department (${req.employee.department}).`);
          }
        }

        validatedEntries.push({
          index,
          activity_type,
          start_time,
          end_time,
          duration_minutes,
          product_id: activity_type === 'work' ? product_id : null,
          operation_id: activity_type === 'work' ? operation_id : null,
          operation_count: activity_type === 'work' ? operation_count : null
        });
      } catch (error) {
        validationErrors.push({
          entry: index,
          error: error.message
        });
      }
    }

    if (validationErrors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        message: `${validationErrors.length} entry/entries failed validation`,
        errors: validationErrors
      });
    }

    // Step 2: Check for overlaps within the bulk entries themselves
    for (let i = 0; i < validatedEntries.length; i++) {
      for (let j = i + 1; j < validatedEntries.length; j++) {
        const entry1 = validatedEntries[i];
        const entry2 = validatedEntries[j];
        
        if (timesOverlap(entry1.start_time, entry1.end_time, entry2.start_time, entry2.end_time)) {
          await t.rollback();
          return res.status(400).json({
            message: `Time overlap detected within bulk entries`,
            error: `Entry ${entry1.index} (${entry1.start_time} - ${entry1.end_time}) overlaps with Entry ${entry2.index} (${entry2.start_time} - ${entry2.end_time})`
          });
        }
      }
    }

    // Step 3: Check for overlaps with existing entries for the same date
    const existingEntries = await WorkEntry.findAll({
      where: {
        technician_id: req.employee.id,
        entry_date: entry_date
      },
      attributes: ['entry_id', 'start_time', 'end_time']
    });

    for (const newEntry of validatedEntries) {
      for (const existing of existingEntries) {
        if (timesOverlap(newEntry.start_time, newEntry.end_time, existing.start_time, existing.end_time)) {
          await t.rollback();
          return res.status(400).json({
            message: `Time entry overlaps with existing entry`,
            error: `Entry ${newEntry.index} (${newEntry.start_time} - ${newEntry.end_time}) overlaps with existing entry #${existing.entry_id} (${existing.start_time} - ${existing.end_time})`
          });
        }
      }
    }

    // Step 4: All validations passed, create all entries
    const results = [];
    for (const entry of validatedEntries) {
      const timeEntry = await WorkEntry.create({
        technician_id: req.employee.id,
        activity_type: entry.activity_type,
        start_time: entry.start_time,
        end_time: entry.end_time,
        duration_minutes: entry.duration_minutes,
        entry_date: entry_date,
        product_id: entry.product_id,
        operation_id: entry.operation_id,
        operation_count: entry.operation_count,
        status: entry.activity_type === 'work' ? 'pending' : 'approved'
      }, { transaction: t });

      results.push(timeEntry);
    }

    await t.commit();

    res.status(201).json({
      message: `Successfully created ${results.length} time entry/entries`,
      created: results.length,
      entries: results
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Get technician's own time entries (work, break, leave)
 */
exports.getMyWorkEntries = async (req, res, next) => {
  try {
    const { status, startDate, endDate, activity_type } = req.query;
    
    const whereClause = {
      technician_id: req.employee.id
    };
    
    if (status) whereClause.status = status;
    if (activity_type) whereClause.activity_type = activity_type;
    
    if (startDate && endDate) {
      whereClause.entry_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    const entries = await WorkEntry.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name', 'status'],
          required: false // Left join - only include if exists
        },
        {
          model: Operations,
          as: 'operation',
          attributes: ['operation_id', 'operation_name'],
          required: false // Left join - only include if exists
        },
        {
          model: Employee,
          as: 'supervisor',
          attributes: ['id', 'employee_code', 'role'],
          required: false
        }
      ],
      order: [['entry_date', 'DESC'], ['start_time', 'ASC']]
    });
    
    res.status(200).json(entries);
  } catch (error) {
    next(error);
  }
};

/**
 * Get work entry by ID (own entries only)
 */
exports.getWorkEntryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const entry = await WorkEntry.findOne({
      where: {
        entry_id: id,
        technician_id: req.employee.id
      },
      include: [
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operations,
          as: 'operation'
        },
        {
          model: Employee,
          as: 'supervisor',
          attributes: ['id', 'employee_code', 'role']
        }
      ]
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    res.status(200).json(entry);
  } catch (error) {
    next(error);
  }
};

/**
 * Update/modify work entry (only if rejected by supervisor)
 */
exports.updateWorkEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      operation_count,
      start_time,
      end_time,
      product_id,
      operation_id
    } = req.body;
    
    const entry = await WorkEntry.findOne({
      where: {
        entry_id: id,
        technician_id: req.employee.id
      }
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    // Only allow modification if entry is rejected
    if (entry.status !== 'rejected') {
      return res.status(400).json({ 
        message: 'Only rejected entries can be modified.' 
      });
    }
    
    let updates = {};
    if (operation_count != null) updates.operation_count = operation_count;
    if (product_id) updates.product_id = product_id;
    if (operation_id) updates.operation_id = operation_id;
    if (start_time || end_time) {
      const newStart = start_time || entry.start_time;
      const newEnd = end_time || entry.end_time;
      const duration_minutes = diffMinutes(newStart, newEnd);
      
      // Check for overlaps with other entries on the same date (excluding current entry)
      const existingEntries = await WorkEntry.findAll({
        where: {
          technician_id: req.employee.id,
          entry_date: entry.entry_date,
          entry_id: { [Op.ne]: entry.entry_id } // Exclude current entry
        },
        attributes: ['entry_id', 'start_time', 'end_time']
      });

      for (const existing of existingEntries) {
        if (timesOverlap(newStart, newEnd, existing.start_time, existing.end_time)) {
          return res.status(400).json({
            message: `Updated time overlaps with existing entry #${existing.entry_id} (${existing.start_time} - ${existing.end_time}). Please adjust your times.`
          });
        }
      }
      
      updates.start_time = newStart;
      updates.end_time = newEnd;
      updates.duration_minutes = duration_minutes;
    }
    updates.status = 'pending'; // Changed from 'modified' to 'pending' to match ENUM

    await entry.update(updates);
    
    res.status(200).json({
      message: 'Work entry updated successfully. Awaiting supervisor review.',
      entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete work entry (only if not approved)
 */
exports.deleteWorkEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const entry = await WorkEntry.findOne({
      where: {
        entry_id: id,
        technician_id: req.employee.id
      }
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    if (entry.status !== 'rejected') {
      return res.status(400).json({ 
        message: 'Only rejected entries can be deleted' 
      });
    }
    
    await entry.destroy();
    
    res.status(200).json({ message: 'Work entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get technician's work summary
 */
exports.getWorkSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {
      technician_id: req.employee.id,
      status: 'approved'
    };
    
    if (startDate && endDate) {
      whereClause.entry_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    // Get work entries summary
    const workSummary = await WorkEntry.findAll({
      where: whereClause,
      attributes: [
        [WorkEntry.sequelize.fn('COUNT', WorkEntry.sequelize.col('entry_id')), 'total_entries'],
        [WorkEntry.sequelize.fn('SUM', WorkEntry.sequelize.col('operation_count')), 'total_operations'],
        [WorkEntry.sequelize.fn('SUM', WorkEntry.sequelize.col('duration_minutes')), 'total_minutes'],
        [WorkEntry.sequelize.fn('AVG', WorkEntry.sequelize.col('operation_count')), 'avg_operations_per_entry']
      ],
      raw: true
    });
    
    // Get pending entries count
    const pendingCount = await WorkEntry.count({
      where: {
        technician_id: req.employee.id,
        status: 'pending'
      }
    });
    
    // Get rejected entries count
    const rejectedCount = await WorkEntry.count({
      where: {
        technician_id: req.employee.id,
        status: 'rejected'
      }
    });
    
    res.status(200).json({
      workSummary: workSummary[0],
      pendingCount,
      rejectedCount,
      period: { startDate, endDate }
    });
  } catch (error) {
    next(error);
  }
};

