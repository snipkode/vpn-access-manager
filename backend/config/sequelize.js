/**
 * Sequelize Database Configuration
 */
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'vpn_access',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
};

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    pool: config.pool,
    define: config.define,
    logging: config.logging
  }
);

// Test connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error.message);
    return false;
  }
}

// Sync database (create tables)
export async function syncDatabase(options = {}) {
  try {
    await sequelize.sync(options);
    console.log('✅ Database synchronized');
    return true;
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    throw error;
  }
}

// Close connection
export async function closeConnection() {
  await sequelize.close();
  console.log('🔒 Database connection closed');
}

export { sequelize, Sequelize };
export default sequelize;
