/**
 * MySQL Database Configuration
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vpn_access',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        role ENUM('admin', 'user') DEFAULT 'user',
        vpn_enabled BOOLEAN DEFAULT FALSE,
        subscription_status ENUM('active', 'trialing', 'canceled', 'expired') DEFAULT 'trialing',
        subscription_canceled_at DATETIME,
        subscription_cancel_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_vpn_enabled (vpn_enabled),
        INDEX idx_subscription_status (subscription_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Devices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        public_key TEXT NOT NULL,
        private_key TEXT,
        status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
        activated_at DATETIME,
        lease_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_ip_address (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Departments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Department devices (many-to-many)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS department_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        UNIQUE KEY unique_department_device (department_id, device_id),
        INDEX idx_department_id (department_id),
        INDEX idx_device_id (device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Firewall rules table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS firewall_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        action ENUM('allow', 'deny') NOT NULL,
        protocol ENUM('tcp', 'udp', 'icmp') DEFAULT 'tcp',
        port INT NOT NULL,
        ip_type ENUM('range', 'individual', 'department') DEFAULT 'range',
        ip_range VARCHAR(255),
        ip_count INT DEFAULT 0,
        ips JSON,
        department_id INT,
        priority INT DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        INDEX idx_enabled (enabled),
        INDEX idx_action (action),
        INDEX idx_port (port),
        INDEX idx_ip_type (ip_type),
        INDEX idx_created_at (created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Access logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        source_ip VARCHAR(45) NOT NULL,
        destination_ip VARCHAR(45),
        port INT,
        protocol VARCHAR(10) DEFAULT 'tcp',
        action ENUM('blocked', 'allowed') NOT NULL,
        rule_id INT,
        country VARCHAR(2),
        user_agent TEXT,
        endpoint VARCHAR(500),
        status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
        reason VARCHAR(255),
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_timestamp (timestamp DESC),
        INDEX idx_source_ip (source_ip),
        INDEX idx_action (action),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'blocked') DEFAULT 'pending',
        payment_method VARCHAR(50),
        bank VARCHAR(50),
        plan VARCHAR(50),
        period_start DATETIME,
        period_end DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Credit transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        from_user_id VARCHAR(255),
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_from_user_id (from_user_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Audit logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        admin_id VARCHAR(255),
        details JSON,
        ip_address VARCHAR(45),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action (action),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.release();
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

export { pool, testConnection, initializeDatabase };
