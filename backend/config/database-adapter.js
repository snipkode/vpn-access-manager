/**
 * Database Abstraction Layer
 * Switch between Firestore and MySQL based on configuration
 */
import dotenv from 'dotenv';
dotenv.config();

const DB_ENABLED = process.env.DB_ENABLED === 'true';

/**
 * Get database type
 */
export function getDatabaseType() {
  return DB_ENABLED ? 'mysql' : 'firestore';
}

/**
 * Check if MySQL is enabled
 */
export function isMySQLEnabled() {
  return DB_ENABLED;
}

/**
 * Initialize database connection
 */
export async function initializeDatabase() {
  if (DB_ENABLED) {
    try {
      const { testConnection, syncDatabase } = await import('./config/sequelize.js');
      await testConnection();
      await syncDatabase({ alter: false });
      console.log('✅ MySQL database initialized');
      return true;
    } catch (error) {
      console.error('❌ MySQL initialization failed:', error.message);
      console.log('⚠️ Falling back to Firestore');
      return false;
    }
  }
  return false;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (DB_ENABLED) {
    try {
      const { closeConnection } = await import('./config/sequelize.js');
      await closeConnection();
      console.log('🔒 MySQL connection closed');
    } catch (error) {
      console.error('Error closing MySQL connection:', error.message);
    }
  }
}

export { DB_ENABLED };
