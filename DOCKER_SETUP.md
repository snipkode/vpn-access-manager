# Docker Setup Guide with MySQL & Sequelize

## Quick Start

### 1. Start MySQL with Docker Compose
```bash
cd /root/vpn

# Copy Docker environment
cp .env.docker .env

# Start MySQL and phpMyAdmin
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Install Dependencies
```bash
cd /root/vpn/backend
npm install
```

### 3. Run Migrations
```bash
# Run Sequelize migrations
npm run db:migrate

# Or manually
npx sequelize-cli db:migrate
```

### 4. Start Backend
```bash
npm run dev
```

## Services

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| MySQL | 3306 | localhost:3306 | vpn_user / vpnpassword123 |
| phpMyAdmin | 8080 | http://localhost:8080 | vpn_user / vpnpassword123 |

## Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f mysql
docker-compose logs -f phpmyadmin

# Restart services
docker-compose restart mysql

# Remove everything (including data)
docker-compose down -v

# Backup database
docker exec vpn_mysql mysqldump -u vpn_user -pvpnpassword123 vpn_access > backup.sql

# Restore database
docker exec -i vpn_mysql mysql -u vpn_user -pvpnpassword123 vpn_access < backup.sql
```

## Sequelize Commands

```bash
# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Run seeders (if any)
npm run db:seed
```

## Project Structure

```
/root/vpn/
├── docker-compose.yml          # Docker services configuration
├── .env.docker                 # Docker environment variables
├── backend/
│   ├── config/
│   │   ├── sequelize.js        # Sequelize connection
│   │   └── database.config.js  # Sequelize CLI config
│   ├── models/
│   │   ├── index.js            # Model aggregator
│   │   ├── User.js             # User model
│   │   ├── Device.js           # Device model
│   │   ├── Department.js       # Department model
│   │   ├── FirewallRule.js     # Firewall rule model
│   │   └── AccessLog.js        # Access log model
│   ├── migrations/
│   │   └── 20260311000000-create-initial-tables.js
│   ├── package.json            # Dependencies with Sequelize
│   └── .env                    # Backend environment
```

## Environment Variables

### Docker (.env)
```bash
MYSQL_ROOT_PASSWORD=rootpassword123
MYSQL_DATABASE=vpn_access
MYSQL_USER=vpn_user
MYSQL_PASSWORD=vpnpassword123
MYSQL_PORT=3306
PMA_PORT=8080
```

### Backend (.env)
```bash
DB_ENABLED=true
DB_HOST=localhost
DB_USER=vpn_user
DB_PASSWORD=vpnpassword123
DB_NAME=vpn_access
DB_PORT=3306
```

## Database Schema

### Tables Created by Migration

1. **users** - User accounts
   - Fields: id, email, name, role, vpn_enabled, subscription_status
   
2. **devices** - WireGuard devices
   - Fields: id, user_id, device_name, ip_address, public_key, status
   
3. **departments** - Department groups
   - Fields: id, name, description, enabled
   
4. **department_devices** - Department-device relationships (many-to-many)
   
5. **firewall_rules** - Firewall configuration
   - Fields: id, name, action, protocol, port, ip_type, enabled
   
6. **access_logs** - Access attempt logs
   - Fields: id, timestamp, source_ip, action, status
   
7. **payments** - Payment records
   
8. **credit_transactions** - Credit transfers
   
9. **audit_logs** - Admin action audit trail

## Accessing MySQL

### From Host
```bash
mysql -h localhost -P 3306 -u vpn_user -pvpnpassword123 vpn_access
```

### From Docker
```bash
docker exec -it vpn_mysql mysql -u vpn_user -pvpnpassword123 vpn_access
```

### Via phpMyAdmin
1. Open http://localhost:8080
2. Login with: vpn_user / vpnpassword123

## Troubleshooting

### MySQL won't start
```bash
# Check logs
docker-compose logs mysql

# Remove and recreate
docker-compose down -v
docker-compose up -d
```

### Migration fails
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Wait for MySQL to be ready
sleep 10

# Run migrations again
npm run db:migrate
```

### Connection refused
```bash
# Check MySQL is running
docker-compose ps

# Check port is not in use
netstat -tlnp | grep 3306

# Change port in .env if needed
MYSQL_PORT=3307
```

## Production Deployment

### Update .env for production
```bash
MYSQL_ROOT_PASSWORD=<strong-password>
MYSQL_USER=<prod-user>
MYSQL_PASSWORD=<strong-password>
DB_HOST=mysql  # Use Docker service name
```

### Docker Compose for production
```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Strategy
```bash
# Daily backup script
0 2 * * * docker exec vpn_mysql mysqldump -u root -p<password> vpn_access | gzip > /backups/vpn_$(date +\%Y\%m\%d).sql.gz
```

## Performance Tuning

### MySQL Configuration (docker-compose.yml)
```yaml
command: >
  --innodb-buffer-pool-size=512M
  --max-connections=200
  --query-cache-size=64M
```

### Sequelize Pool Configuration
```javascript
pool: {
  max: 20,
  min: 5,
  acquire: 60000,
  idle: 30000
}
```

## Migration from Firestore

1. Start MySQL with Docker
2. Run migrations
3. Run migration script:
```bash
node migrate-to-mysql.js
```
4. Update backend to use MySQL:
```bash
DB_ENABLED=true
```
5. Test thoroughly
6. Switch traffic

## Benefits

| Feature | Firestore | MySQL + Docker |
|---------|-----------|----------------|
| Cost | $0.036/100K reads | Free (self-hosted) |
| Latency | ~100ms | ~5ms |
| Control | Limited | Full control |
| Backup | Manual | Automated |
| Scaling | Automatic | Manual |
| Joins | No | Yes |
