/**
 * Firewall Service - MySQL Implementation
 */
import { FirewallRule, Department, AccessLog } from '../models/index.js';
import { Op } from 'sequelize';

const FIREWALL_COLLECTION = 'firewall_rules';

/**
 * Get all firewall rules from database
 * @returns {Promise<Object>} Firewall rules
 */
export async function getAllRules() {
  try {
    const rules = await FirewallRule.findAll({
      order: [['created_at', 'DESC']],
      include: [{
        model: Department,
        as: 'department',
        required: false
      }]
    });

    return {
      rules: rules.map(rule => rule.toJSON())
    };
  } catch (error) {
    console.error('Error getting firewall rules:', error.message);
    throw new Error('Failed to get firewall rules');
  }
}

/**
 * Get active rules only
 * @returns {Promise<Object>} Active firewall rules
 */
export async function getActiveRules() {
  try {
    const rules = await FirewallRule.findAll({
      where: { enabled: true },
      order: [['created_at', 'DESC']],
      include: [{
        model: Department,
        as: 'department',
        required: false
      }]
    });

    return {
      rules: rules.map(rule => rule.toJSON())
    };
  } catch (error) {
    console.error('Error getting active firewall rules:', error.message);
    return { rules: [] };
  }
}

/**
 * Get firewall rule by ID
 * @param {number} ruleId - Rule ID
 * @returns {Promise<Object>} Firewall rule
 */
export async function getRuleById(ruleId) {
  try {
    const rule = await FirewallRule.findByPk(ruleId, {
      include: [{
        model: Department,
        as: 'department',
        required: false
      }]
    });

    if (!rule) {
      throw new Error('Rule not found');
    }

    return { rule: rule.toJSON() };
  } catch (error) {
    console.error('Error getting rule:', error.message);
    throw new Error('Failed to get rule');
  }
}

/**
 * Create new firewall rule
 * @param {Object} ruleData - Rule data
 * @returns {Promise<Object>} Created rule
 */
export async function createRule(ruleData) {
  try {
    const rule = await FirewallRule.create(ruleData);
    return { rule: rule.toJSON(), message: 'Firewall rule created successfully' };
  } catch (error) {
    console.error('Error creating rule:', error.message);
    throw new Error('Failed to create firewall rule');
  }
}

/**
 * Update firewall rule
 * @param {number} ruleId - Rule ID
 * @param {Object} ruleData - Rule data
 * @returns {Promise<Object>} Updated rule
 */
export async function updateRule(ruleId, ruleData) {
  try {
    const [updated] = await FirewallRule.update(ruleData, {
      where: { id: ruleId }
    });

    if (!updated) {
      throw new Error('Rule not found');
    }

    const rule = await FirewallRule.findByPk(ruleId);
    return { rule: rule.toJSON(), message: 'Firewall rule updated successfully' };
  } catch (error) {
    console.error('Error updating rule:', error.message);
    throw new Error('Failed to update firewall rule');
  }
}

/**
 * Delete firewall rule
 * @param {number} ruleId - Rule ID
 * @returns {Promise<Object>} Success message
 */
export async function deleteRule(ruleId) {
  try {
    const deleted = await FirewallRule.destroy({
      where: { id: ruleId }
    });

    if (!deleted) {
      throw new Error('Rule not found');
    }

    return { message: 'Firewall rule deleted successfully' };
  } catch (error) {
    console.error('Error deleting rule:', error.message);
    throw new Error('Failed to delete firewall rule');
  }
}

/**
 * Toggle firewall rule enabled/disabled
 * @param {number} ruleId - Rule ID
 * @returns {Promise<Object>} Updated rule
 */
export async function toggleRule(ruleId) {
  try {
    const rule = await FirewallRule.findByPk(ruleId);
    
    if (!rule) {
      throw new Error('Rule not found');
    }

    rule.enabled = !rule.enabled;
    await rule.save();

    return { 
      rule: rule.toJSON(), 
      message: `Firewall rule ${rule.enabled ? 'enabled' : 'disabled'} successfully` 
    };
  } catch (error) {
    console.error('Error toggling rule:', error.message);
    throw new Error('Failed to toggle firewall rule');
  }
}

/**
 * Get access stats
 * @returns {Promise<Object>} Access statistics
 */
export async function getAccessStats() {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const totalAttempts = await AccessLog.count();
    const recentAttempts = await AccessLog.count({
      where: {
        timestamp: {
          [Op.gte]: last24Hours
        }
      }
    });

    const blockedCount = await AccessLog.count({
      where: { action: 'blocked' }
    });

    const allowedCount = await AccessLog.count({
      where: { action: 'allowed' }
    });

    return {
      stats: {
        total_attempts: totalAttempts,
        recent_attempts: recentAttempts,
        blocked: blockedCount,
        allowed: allowedCount
      }
    };
  } catch (error) {
    console.error('Error getting access stats:', error.message);
    return { stats: {} };
  }
}

/**
 * Get recent access attempts
 * @param {number} limit - Limit
 * @param {Object} filter - Filter options
 * @returns {Promise<Object>} Access attempts
 */
export async function getAccessAttempts(limit = 50, filter = {}) {
  try {
    const where = {};
    
    if (filter.action) {
      where.action = filter.action;
    }
    
    if (filter.source_ip) {
      where.source_ip = filter.source_ip;
    }

    const attempts = await AccessLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit) || 50
    });

    return {
      attempts: attempts.map(log => log.toJSON())
    };
  } catch (error) {
    console.error('Error getting access attempts:', error.message);
    return { attempts: [] };
  }
}

/**
 * Get suspicious activity
 * @returns {Promise<Object>} Suspicious activity
 */
export async function getSuspiciousActivity() {
  try {
    const suspicious = await AccessLog.findAll({
      attributes: [
        'source_ip',
        [AccessLog.sequelize.fn('COUNT', AccessLog.col('id')), 'blocked'],
        [AccessLog.sequelize.fn('GROUP_CONCAT', AccessLog.sequelize.col('port')), 'ports_targeted'],
        [AccessLog.sequelize.fn('MAX', AccessLog.sequelize.col('timestamp')), 'last_seen']
      ],
      where: { action: 'blocked' },
      group: ['source_ip'],
      having: AccessLog.sequelize.where(
        AccessLog.sequelize.fn('COUNT', AccessLog.col('id')),
        '>=',
        5
      ),
      order: [[AccessLog.sequelize.literal('blocked'), 'DESC']],
      limit: 100
    });

    const result = suspicious.map(item => {
      const data = item.toJSON();
      const ports = data.ports_targeted ? data.ports_targeted.split(',').filter(Boolean) : [];
      
      return {
        ip: data.source_ip,
        blocked: parseInt(data.blocked) || 0,
        ports_targeted: [...new Set(ports)],
        last_seen: data.last_seen,
        risk_level: data.blocked >= 20 ? 'critical' : data.blocked >= 10 ? 'high' : 'medium'
      };
    });

    return {
      suspicious: result
    };
  } catch (error) {
    console.error('Error getting suspicious activity:', error.message);
    return { suspicious: [] };
  }
}
