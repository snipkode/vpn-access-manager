# Stunnel Setup Guide - Port 445 to 5000

## 📋 Overview

This guide explains how to setup stunnel to forward traffic from port **445** to the VPN API running on port **5000**.

### Use Cases:
- **Port Forwarding**: Access API through different port
- **SSL/TLS Termination**: Add HTTPS to HTTP API
- **Firewall Bypass**: Use allowed ports (445 is often open)
- **Load Balancing**: Multiple backend instances

---

## 🚀 Quick Setup

### **Option 1: Automated Script (Recommended)**

```bash
cd /root/vpn/backend/stunnel

# Make script executable
chmod +x setup-stunnel.sh

# Run setup (requires root)
sudo ./setup-stunnel.sh
```

This will:
1. Install stunnel
2. Copy configuration
3. Generate SSL certificates (optional)
4. Start the service
5. Verify port forwarding

---

### **Option 2: Manual Setup**

#### **Step 1: Install Stunnel**

**Debian/Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install -y stunnel4
```

**CentOS/RHEL:**
```bash
sudo yum install -y stunnel
```

#### **Step 2: Configure Stunnel**

```bash
sudo nano /etc/stunnel/stunnel.conf
```

Paste this configuration:

```ini
[global]
foreground = no
syslog = yes

[vpn-api-445]
accept = 445
connect = 5000
client = no
```

#### **Step 3: Enable & Start Service**

```bash
# Enable on boot
sudo sed -i 's/ENABLED=0/ENABLED=1/' /etc/default/stunnel4

# Start service
sudo systemctl enable stunnel4
sudo systemctl start stunnel4
```

#### **Step 4: Verify**

```bash
# Check status
sudo systemctl status stunnel4

# Check port 445 is listening
sudo netstat -tlnp | grep :445
# or
sudo ss -tlnp | grep :445

# Test connection
curl http://localhost:445/health
```

---

## 🔧 Configuration Options

### **Basic TCP Forwarding (No SSL)**

```ini
[vpn-api-445]
accept = 445
connect = 5000
client = no
```

### **HTTPS to HTTP (SSL Termination)**

```ini
[vpn-api-https]
accept = 445
connect = 5000
cert = /etc/stunnel/stunnel.pem
key = /etc/stunnel/stunnel.key
client = no
```

### **Multiple Ports**

```ini
# Forward 445 → 5000
[vpn-api-445]
accept = 445
connect = 5000

# Forward 8443 → 5000
[vpn-api-8443]
accept = 8443
connect = 5000

# Forward 443 → 5000 (HTTPS)
[vpn-api-443]
accept = 443
connect = 5000
cert = /etc/stunnel/stunnel.pem
key = /etc/stunnel/stunnel.key
```

---

## 🔐 SSL Certificate Setup

### **Generate Self-Signed Certificate**

```bash
sudo openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
  -subj "/C=ID/ST=Indonesia/L=Jakarta/O=VPN Access/CN=localhost" \
  -keyout /etc/stunnel/stunnel.key \
  -out /etc/stunnel/stunnel.crt

# Combine cert and key
sudo cat /etc/stunnel/stunnel.crt /etc/stunnel/stunnel.key > /etc/stunnel/stunnel.pem
sudo chmod 600 /etc/stunnel/stunnel.pem
```

### **Use Let's Encrypt Certificate**

```bash
# Get certificate from Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com

# Configure stunnel to use it
cert = /etc/letsencrypt/live/yourdomain.com/fullchain.pem
key = /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

---

## 🛠️ Service Management

### **Start/Stop/Restart**

```bash
# Start
sudo systemctl start stunnel4

# Stop
sudo systemctl stop stunnel4

# Restart
sudo systemctl restart stunnel4

# Reload config
sudo systemctl reload stunnel4
```

### **Enable/Disable on Boot**

```bash
# Enable
sudo systemctl enable stunnel4

# Disable
sudo systemctl disable stunnel4
```

### **Check Status**

```bash
# Status
sudo systemctl status stunnel4

# Logs
sudo journalctl -u stunnel4 -f

# Recent logs
sudo journalctl -u stunnel4 -n 50
```

---

## 🧪 Testing

### **Test Port Forwarding**

```bash
# Test health endpoint
curl http://localhost:445/health

# Test API endpoint
curl http://localhost:445/api

# Verbose output
curl -v http://localhost:445/health
```

### **Test from Remote Machine**

```bash
# From another machine
curl http://YOUR_SERVER_IP:445/health

# Should return same as port 5000
curl http://YOUR_SERVER_IP:5000/health
```

### **Check Connections**

```bash
# Active connections
sudo netstat -an | grep 445

# Connection count
sudo netstat -an | grep 445 | wc -l

# With process info
sudo netstat -tlnp | grep 445
```

---

## 🐛 Troubleshooting

### **Issue: Port 445 Already in Use**

```bash
# Check what's using port 445
sudo lsof -i :445
sudo netstat -tlnp | grep 445

# Stop conflicting service (e.g., Samba)
sudo systemctl stop smbd
sudo systemctl disable smbd
```

### **Issue: Stunnel Won't Start**

```bash
# Check logs
sudo journalctl -u stunnel4 -f

# Common errors:
# - Permission denied: Check cert permissions (chmod 600)
# - Address already in use: Port conflict
# - Configuration error: Check syntax
```

### **Issue: Connection Refused**

```bash
# Check if API is running on 5000
curl http://localhost:5000/health

# Check if stunnel is running
sudo systemctl status stunnel4

# Check firewall
sudo ufw status
sudo ufw allow 445/tcp
```

### **Issue: SSL Handshake Failed**

```bash
# Check certificate
sudo openssl x509 -in /etc/stunnel/stunnel.crt -text -noout

# Regenerate certificate
sudo rm /etc/stunnel/stunnel.pem
# Follow certificate generation steps above
```

---

## 🔒 Security Considerations

### **Firewall Rules**

```bash
# Allow port 445
sudo ufw allow 445/tcp

# Deny direct access to 5000 (optional)
sudo ufw deny 5000/tcp

# Allow only from specific IPs
sudo ufw allow from 192.168.1.0/24 to any port 445
```

### **SELinux (CentOS/RHEL)**

```bash
# Allow stunnel to bind to ports
sudo setsebool -P stunnel_connect_any 1

# Check SELinux status
getenforce
```

### **Disable Plain TCP (Force SSL)**

```ini
[vpn-api-445]
accept = 445
connect = 5000
cert = /etc/stunnel/stunnel.pem
key = /etc/stunnel/stunnel.key
client = no
# Require SSL
sslVersion = TLSv1.2
ciphers = HIGH:!aNULL:!MD5
```

---

## 📊 Performance Tuning

### **Optimize stunnel.conf**

```ini
[global]
# Increase connection backlog
socket = l:SO_BACKLOG=1024

# Enable TCP keepalive
socket = l:SO_KEEPALIVE=1

# Disable Nagle's algorithm
socket = l:TCP_NODELAY=1
socket = r:TCP_NODELAY=1

# Compression (if CPU available)
compression = zlib

# Process priority
priority = -10
```

### **System Limits**

```bash
# Increase file descriptor limit
echo "fs.file-max = 65535" >> /etc/sysctl.conf
sysctl -p

# Increase max connections
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf
```

---

## 📄 File Locations

| File | Purpose |
|------|---------|
| `/etc/stunnel/stunnel.conf` | Main configuration |
| `/etc/stunnel/stunnel.pem` | SSL certificate + key |
| `/etc/stunnel/stunnel.crt` | SSL certificate |
| `/etc/stunnel/stunnel.key` | SSL private key |
| `/var/log/stunnel4/stunnel.log` | Log file (Debian) |
| `/var/log/stunnel/stunnel.log` | Log file (RHEL) |
| `/etc/default/stunnel4` | Service config (Debian) |

---

## ✅ Verification Checklist

- [ ] Stunnel installed
- [ ] Configuration copied to `/etc/stunnel/stunnel.conf`
- [ ] Service enabled and running
- [ ] Port 445 listening
- [ ] Port 5000 API accessible
- [ ] Test connection successful
- [ ] Logs show no errors
- [ ] Firewall allows port 445
- [ ] SSL certificate valid (if using SSL)

---

**Setup Complete!** 🎉

Test with: `curl http://localhost:445/health`
