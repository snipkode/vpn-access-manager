# MySQL Migration Guide

## Overview
Migrate from Firestore to MySQL for better performance, lower costs, and more control.

## Prerequisites

1. **Install MySQL Server**
```bash
# Ubuntu/Debian
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# macOS (Homebrew)
brew install mysql
```

2. **Install Node.js MySQL driver**
```bash
cd /root/vpn/backend
npm install mysql2
```

## Setup MySQL Database

1. **Create database and user**
```sql
CREATE DATABASE vpn_access CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vpn_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON vpn_access.* TO 'vpn_user'@'localhost';
FLUSH PRIVILEGES;
```

2. **Update .env file**
```bash
# Enable MySQL
DB_ENABLED=true
DB_HOST=localhost
DB_USER=vpn_user
DB_PASSWORD=your_secure_password
DB_NAME=vpn_access
DB_PORT=3306
```

3. **Run migration script**
```bash
cd /root/vpn/backend
node migrate-to-mysql.js
```

## Migration Script Details

The migration script will:
- Create all required tables with proper indexes
- Migrate users from Firestore
- Migrate devices and link to users
- Migrate departments and device assignments
- Migrate firewall rules
- Migrate last 10,000 access logs (older logs are archived)

## Tables Created

| Table | Description |
|-------|-------------|
| `users` | User accounts and subscription status |
| `devices` | WireGuard devices |
| `departments` | Department groups |
| `department_devices` | Department-device relationships |
| `firewall_rules` | Firewall configuration |
| `access_logs` | Access attempt logs |
| `payments` | Payment records |
| `credit_transactions` | Credit/transfer history |
| `audit_logs` | Admin action audit trail |

## Post-Migration Steps

1. **Verify data migration**
```sql
USE vpn_access;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM devices;
SELECT COUNT(*) FROM firewall_rules;
SELECT COUNT(*) FROM access_logs;
```

2. **Update backend code**
   - Services will automatically use MySQL when `DB_ENABLED=true`
   - Firestore remains as fallback during transition

3. **Test the application**
   - Login/logout
   - Add/edit users
   - Create firewall rules
   - Check access logs

4. **Monitor performance**
```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Check table sizes
SELECT table_name, 
       ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'vpn_access'
ORDER BY (data_length + index_length) DESC;
```

## Benefits of MySQL

| Aspect | Firestore | MySQL |
|--------|-----------|-------|
| Cost | $0.036/100K reads | Free (self-hosted) |
| Read Speed | ~100ms | ~5ms |
| Complex Queries | Limited | Full SQL |
| Joins | Not supported | Full support |
| Transactions | Limited | Full ACID |
| Backup | Manual export | Standard tools |

## Rollback Plan

If you need to rollback to Firestore:
1. Set `DB_ENABLED=false` in .env
2. Restart backend
3. All data still exists in Firestore

## Maintenance

### Backup MySQL
```bash
# Full backup
mysqldump -u vpn_user -p vpn_access > backup.sql

# Restore
mysql -u vpn_user -p vpn_access < backup.sql
```

### Optimize Tables
```sql
OPTIMIZE TABLE access_logs;
OPTIMIZE TABLE audit_logs;
```

### Archive Old Logs
```sql
-- Create archive table
CREATE TABLE access_logs_archive LIKE access_logs;

-- Move old logs (older than 90 days)
INSERT INTO access_logs_archive
SELECT * FROM access_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);

DELETE FROM access_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## Troubleshooting

### Connection refused
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check port is open
netstat -tlnp | grep 3306
```

### Permission denied
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON vpn_access.* TO 'vpn_user'@'localhost';
FLUSH PRIVILEGES;
```

### Migration fails
1. Check error logs
2. Verify MySQL credentials
3. Ensure database exists
4. Run migration again (safe to retry)

## Support

For issues during migration:
1. Check backend logs: `pm2 logs backdev`
2. Check MySQL logs: `/var/log/mysql/error.log`
3. Verify connection: `mysql -u vpn_user -p vpn_access`
