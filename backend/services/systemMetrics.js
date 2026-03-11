import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';

/**
 * System Metrics Service
 * Monitors CPU, Memory, Disk, and Network usage
 */

/**
 * Execute shell command safely
 * @param {string} command - Command to execute
 * @returns {string} Command output
 */
function executeCommand(command) {
  try {
    const output = execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    console.warn(`Command warning: ${error.message}`);
    return error.stdout?.trim() || '';
  }
}

/**
 * Get CPU usage percentage
 * @returns {Object} CPU metrics
 */
export function getCPUUsage() {
  try {
    // Try to get from /proc/stat (Linux)
    const stat1 = fs.readFileSync('/proc/stat', 'utf8');
    
    return {
      usage_percent: getCpuPercentage(),
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      speed: os.cpus()[0]?.speed || 0,
      times: os.cpus()[0]?.times || {},
      load_average: os.loadavg()
    };
  } catch (error) {
    return {
      usage_percent: 0,
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      error: error.message
    };
  }
}

// Track CPU times for percentage calculation
let prevCpuTimes = null;
let prevCpuTime = null;

function getCpuPercentage() {
  try {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i].times;
      totalIdle += cpu.idle;
      totalTick += cpu.user + cpu.nice + cpu.sys + cpu.idle + cpu.irq + cpu.softirq;
    }

    const diffIdle = totalIdle - (prevCpuTimes?.totalIdle || 0);
    const diffTotal = totalTick - (prevCpuTime || 0);
    const diffPercentage = (1 - diffIdle / diffTotal) * 100;

    prevCpuTimes = { totalIdle };
    prevCpuTime = totalTick;

    return isNaN(diffPercentage) ? 0 : Math.round(diffPercentage * 100) / 100;
  } catch (error) {
    return 0;
  }
}

/**
 * Get memory usage
 * @returns {Object} Memory metrics
 */
export function getMemoryUsage() {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    // Try to get more detailed info from /proc/meminfo
    let memInfo = {};
    try {
      const meminfoContent = fs.readFileSync('/proc/meminfo', 'utf8');
      meminfoContent.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2) {
          const value = parseInt(parts[1].trim().split(' ')[0]) * 1024; // Convert from KB to bytes
          memInfo[parts[0].trim()] = value;
        }
      });
    } catch (e) {
      // Use OS defaults
    }

    return {
      total,
      free,
      used,
      usage_percent: Math.round((used / total) * 100 * 100) / 100,
      platform: process.platform,
      details: memInfo.Total ? {
        total: memInfo.Total,
        free: memInfo.MemFree,
        available: memInfo.MemAvailable,
        buffers: memInfo.Buffers,
        cached: memInfo.Cached,
        swap_total: memInfo.SwapTotal,
        swap_free: memInfo.SwapFree
      } : null
    };
  } catch (error) {
    return {
      total: os.totalmem(),
      free: os.freemem(),
      used: 0,
      usage_percent: 0,
      error: error.message
    };
  }
}

/**
 * Get disk usage
 * @returns {Array} Disk usage for all mounts
 */
export function getDiskUsage() {
  try {
    const output = executeCommand('df -h --output=source,size,used,avail,pcent,target 2>/dev/null | grep -E "^/dev"');
    const lines = output.split('\n').filter(l => l.trim());

    const disks = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        disks.push({
          device: parts[0],
          size: parseSize(parts[1]),
          used: parseSize(parts[2]),
          available: parseSize(parts[3]),
          usage_percent: parseFloat(parts[4]),
          mount_point: parts[5]
        });
      }
    }

    // If df failed, use Node.js os info
    if (disks.length === 0) {
      const total = getDiskTotalSync('/');
      const free = getDiskFreeSync('/');
      disks.push({
        device: 'root',
        size: total,
        used: total - free,
        available: free,
        usage_percent: Math.round(((total - free) / total) * 100 * 100) / 100,
        mount_point: '/'
      });
    }

    return disks;
  } catch (error) {
    return [{
      device: 'unknown',
      size: 0,
      used: 0,
      available: 0,
      usage_percent: 0,
      mount_point: '/',
      error: error.message
    }];
  }
}

function parseSize(sizeStr) {
  const multipliers = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT])?$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  return unit ? value * multipliers[unit] : value;
}

function getDiskTotalSync(path) {
  try {
    const stat = fs.statfsSync(path);
    return stat.bsize * stat.blocks;
  } catch (e) {
    return 0;
  }
}

function getDiskFreeSync(path) {
  try {
    const stat = fs.statfsSync(path);
    return stat.bsize * stat.bfree;
  } catch (e) {
    return 0;
  }
}

/**
 * Get network statistics
 * @returns {Object} Network metrics
 */
export function getNetworkStats() {
  try {
    // Get network interfaces
    const interfaces = os.networkInterfaces();
    const interfaceStats = {};

    // Try to get detailed stats from /proc/net/dev
    try {
      const netDev = fs.readFileSync('/proc/net/dev', 'utf8');
      const lines = netDev.split('\n').slice(2); // Skip header

      for (const line of lines) {
        const parts = line.trim().split(':');
        if (parts.length === 2) {
          const iface = parts[0].trim();
          const stats = parts[1].trim().split(/\s+/);
          
          interfaceStats[iface] = {
            rx_bytes: parseInt(stats[0]),
            rx_packets: parseInt(stats[1]),
            rx_errors: parseInt(stats[2]),
            rx_dropped: parseInt(stats[3]),
            tx_bytes: parseInt(stats[8]),
            tx_packets: parseInt(stats[9]),
            tx_errors: parseInt(stats[10]),
            tx_dropped: parseInt(stats[11])
          };
        }
      }
    } catch (e) {
      // Use basic interface info
    }

    // Get basic interface info
    const basicInfo = {};
    for (const [name, addrs] of Object.entries(interfaces)) {
      basicInfo[name] = {
        addresses: addrs.map(addr => ({
          family: addr.family,
          address: addr.address,
          netmask: addr.netmask
        })),
        internal: addrs[0]?.internal || false
      };
    }

    return {
      interfaces: Object.keys(interfaces).length,
      interface_stats: interfaceStats,
      basic_info: basicInfo
    };
  } catch (error) {
    return {
      interfaces: 0,
      interface_stats: {},
      error: error.message
    };
  }
}

/**
 * Get process list (top consumers)
 * @param {number} limit - Number of processes to return
 * @returns {Array} Top processes
 */
export function getTopProcesses(limit = 10) {
  try {
    const output = executeCommand(`ps aux --sort=-%cpu | head -${limit + 1}`);
    const lines = output.split('\n').slice(1); // Skip header

    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0],
        pid: parseInt(parts[1]),
        cpu_percent: parseFloat(parts[2]),
        memory_percent: parseFloat(parts[3]),
        vsz: parseInt(parts[4]),
        rss: parseInt(parts[5]),
        tty: parts[6],
        stat: parts[7],
        start: parts[8],
        time: parts[9],
        command: parts.slice(10).join(' ')
      };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Get system uptime
 * @returns {Object} Uptime info
 */
export function getUptime() {
  const uptimeSeconds = os.uptime();
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  return {
    seconds: uptimeSeconds,
    formatted: `${days}d ${hours}h ${minutes}m`,
    boot_time: new Date(Date.now() - uptimeSeconds * 1000).toISOString()
  };
}

/**
 * Get all system metrics
 * @returns {Object} Complete system metrics
 */
export function getAllMetrics() {
  return {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
    cpu: getCPUUsage(),
    memory: getMemoryUsage(),
    disk: getDiskUsage(),
    network: getNetworkStats(),
    uptime: getUptime(),
    node_version: process.version,
    pid: process.pid
  };
}

/**
 * Get metrics delta (for real-time updates)
 * @param {Object} prevMetrics - Previous metrics
 * @returns {Object} Metrics with deltas
 */
export function getMetricsDelta(prevMetrics) {
  const current = getAllMetrics();
  
  const delta = {
    ...current,
    delta: {}
  };

  if (prevMetrics) {
    // CPU delta
    delta.delta.cpu = current.cpu.usage_percent - (prevMetrics.cpu?.usage_percent || 0);
    
    // Memory delta
    delta.delta.memory = current.memory.usage_percent - (prevMetrics.memory?.usage_percent || 0);
    
    // Network delta (bytes per second)
    const timeDiff = (new Date(current.timestamp) - new Date(prevMetrics.timestamp)) / 1000;
    if (timeDiff > 0 && prevMetrics.network?.interface_stats) {
      delta.delta.network = {};
      for (const [iface, stats] of Object.entries(current.network.interface_stats || {})) {
        const prevStats = prevMetrics.network.interface_stats[iface] || {};
        delta.delta.network[iface] = {
          rx_bytes_per_sec: Math.round((stats.rx_bytes - (prevStats.rx_bytes || 0)) / timeDiff),
          tx_bytes_per_sec: Math.round((stats.tx_bytes - (prevStats.tx_bytes || 0)) / timeDiff)
        };
      }
    }
  }

  return delta;
}
