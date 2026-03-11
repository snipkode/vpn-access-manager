/**
 * User Service - MySQL Implementation
 */
import { User, Device, Payment, CreditTransaction } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get all users
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Users list
 */
export async function getUsers(params = {}) {
  try {
    const { role, vpn_enabled, limit = 100, offset = 0 } = params;
    
    const where = {};
    if (role) where.role = role;
    if (vpn_enabled !== undefined) where.vpn_enabled = vpn_enabled === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      users: rows.map(user => user.toJSON()),
      total: count
    };
  } catch (error) {
    console.error('Error getting users:', error.message);
    throw new Error('Failed to get users');
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUserById(userId) {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Device,
          as: 'devices',
          required: false
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { user: user.toJSON() };
  } catch (error) {
    console.error('Error getting user:', error.message);
    throw new Error('Failed to get user');
  }
}

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
  try {
    const user = await User.create(userData);
    return { user: user.toJSON(), message: 'User created successfully' };
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw new Error('Failed to create user');
  }
}

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, userData) {
  try {
    const [updated] = await User.update(userData, {
      where: { id: userId }
    });

    if (!updated) {
      throw new Error('User not found');
    }

    const user = await User.findByPk(userId);
    return { user: user.toJSON(), message: 'User updated successfully' };
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw new Error('Failed to update user');
  }
}

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success message
 */
export async function deleteUser(userId) {
  try {
    const deleted = await User.destroy({
      where: { id: userId }
    });

    if (!deleted) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error.message);
    throw new Error('Failed to delete user');
  }
}

/**
 * Toggle user VPN access
 * @param {string} userId - User ID
 * @param {boolean} vpnEnabled - VPN enabled status
 * @returns {Promise<Object>} Updated user
 */
export async function toggleVpnAccess(userId, vpnEnabled) {
  try {
    const [updated] = await User.update(
      { vpn_enabled: vpnEnabled },
      { where: { id: userId } }
    );

    if (!updated) {
      throw new Error('User not found');
    }

    const user = await User.findByPk(userId);
    return { 
      user: user.toJSON(), 
      message: `VPN access ${vpnEnabled ? 'enabled' : 'disabled'} successfully` 
    };
  } catch (error) {
    console.error('Error toggling VPN access:', error.message);
    throw new Error('Failed to toggle VPN access');
  }
}

/**
 * Get dashboard stats
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getDashboardStats() {
  try {
    const totalUsers = await User.count();
    const vpnEnabledUsers = await User.count({ where: { vpn_enabled: true } });
    const vpnDisabledUsers = await User.count({ where: { vpn_enabled: false } });
    
    const adminUsers = await User.count({ where: { role: 'admin' } });
    const regularUsers = await User.count({ where: { role: 'user' } });

    const activeDevices = await Device.count({ where: { status: 'active' } });

    // Payment stats
    const totalRevenue = await Payment.sum('amount', { 
      where: { status: 'approved' } 
    }) || 0;

    const thisMonthRevenue = await Payment.sum('amount', {
      where: {
        status: 'approved',
        created_at: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }) || 0;

    const lastMonthRevenue = await Payment.sum('amount', {
      where: {
        status: 'approved',
        created_at: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          [Op.lt]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }) || 0;

    const averagePayment = totalRevenue > 0 
      ? totalRevenue / await Payment.count({ where: { status: 'approved' } }) 
      : 0;

    // Order stats
    const totalOrders = await Payment.count();
    const approvedOrders = await Payment.count({ where: { status: 'approved' } });
    const pendingOrders = await Payment.count({ where: { status: 'pending' } });
    const rejectedOrders = await Payment.count({ where: { status: 'rejected' } });
    const blockedPayments = await Payment.count({ where: { status: 'blocked' } });

    // Payment by plan
    const paymentByPlan = await Payment.findAll({
      attributes: [
        'plan',
        [Payment.sequelize.fn('COUNT', Payment.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.col('amount')), 'total']
      ],
      group: ['plan']
    });

    // Payment by bank
    const paymentByBank = await Payment.findAll({
      attributes: [
        'bank',
        [Payment.sequelize.fn('COUNT', Payment.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.col('amount')), 'total']
      ],
      group: ['bank']
    });

    return {
      stats: {
        total_users: totalUsers,
        vpn_enabled_users: vpnEnabledUsers,
        vpn_disabled_users: vpnDisabledUsers,
        active_devices: activeDevices,
        users_by_role: {
          admin: adminUsers,
          user: regularUsers
        },
        users_by_vpn_status: {
          enabled: vpnEnabledUsers,
          disabled: vpnDisabledUsers
        },
        billing: {
          total_revenue: totalRevenue,
          this_month_revenue: thisMonthRevenue,
          last_month_revenue: lastMonthRevenue,
          average_payment: averagePayment,
          total_orders: totalOrders,
          approved_orders: approvedOrders,
          pending_orders: pendingOrders,
          rejected_orders: rejectedOrders,
          blocked_payments: blockedPayments,
          payment_by_plan: paymentByPlan.reduce((acc, item) => {
            const data = item.toJSON();
            acc[data.plan] = {
              count: parseInt(data.count),
              total: parseFloat(data.total) || 0
            };
            return acc;
          }, {}),
          payment_by_bank: paymentByBank.reduce((acc, item) => {
            const data = item.toJSON();
            acc[data.bank] = {
              count: parseInt(data.count),
              total: parseFloat(data.total) || 0
            };
            return acc;
          }, {})
        }
      }
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error.message);
    return { stats: {} };
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} User data
 */
export async function getUserByEmail(email) {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error('User not found');
    }

    return { user: user.toJSON() };
  } catch (error) {
    console.error('Error getting user by email:', error.message);
    throw new Error('Failed to get user');
  }
}
