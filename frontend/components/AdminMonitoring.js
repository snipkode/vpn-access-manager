import { useState, useEffect, useRef } from 'react';
import { adminFirewallAPI, adminMonitoringAPI } from '../lib/api';
import { useUIStore } from '../store';
import { StatusBadge } from './admin';

export default function AdminMonitoring() {
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [accessLogs, setAccessLogs] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const wsRef = useRef(null);
  const { showNotification } = useUIStore();

  useEffect(() => {
    fetchInitialData();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [healthData, accessStats] = await Promise.all([
        adminMonitoringAPI.getHealth(),
        adminFirewallAPI.getAccessStats()
      ]);
      setHealth(healthData);
      
      const logs = await adminFirewallAPI.getAccessAttempts({ limit: 50 });
      setAccessLogs(logs.attempts || []);
      
      const suspicious = await adminFirewallAPI.getSuspiciousActivity();
      setSuspiciousActivity(suspicious.suspicious || []);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    // Construct WebSocket URL from API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const apiHost = apiUrl.replace('http://', '').replace('https://', '').replace('/api', '');
    const isHttps = apiUrl.startsWith('https://');
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${apiHost}/ws/monitoring`;
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        
        // Subscribe to data types
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          payload: { types: ['metrics', 'access_logs', 'firewall_events', 'security_alerts'] }
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'metrics':
              setMetrics(data.data);
              // Update health based on new metrics
              updateHealthFromMetrics(data.data);
              break;
            case 'access_logs':
              setAccessLogs(data.data.recent_attempts || []);
              if (data.data.suspicious_activity) {
                setSuspiciousActivity(data.data.suspicious_activity);
              }
              break;
            case 'firewall_event':
              showNotification(`Firewall Event: ${data.data.event_type}`, 'info');
              break;
            case 'security_alert':
              showNotification(`Security Alert: ${data.data.message}`, 'error');
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setWsConnected(false);

        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error.message);
      setWsConnected(false);
    }
  };

  const updateHealthFromMetrics = (newMetrics) => {
    // Calculate health from metrics
    let healthScore = 100;
    const issues = [];

    if (newMetrics.cpu?.usage_percent > 90) {
      healthScore -= 30;
      issues.push({ type: 'cpu', severity: 'critical' });
    } else if (newMetrics.cpu?.usage_percent > 70) {
      healthScore -= 15;
      issues.push({ type: 'cpu', severity: 'warning' });
    }

    if (newMetrics.memory?.usage_percent > 90) {
      healthScore -= 30;
      issues.push({ type: 'memory', severity: 'critical' });
    } else if (newMetrics.memory?.usage_percent > 70) {
      healthScore -= 15;
      issues.push({ type: 'memory', severity: 'warning' });
    }

    setHealth({
      health_score: healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      issues,
      metrics: {
        cpu: newMetrics.cpu?.usage_percent,
        memory: newMetrics.memory?.usage_percent,
        disk: newMetrics.disk?.map(d => ({ mount: d.mount_point, usage: d.usage_percent })),
        uptime: newMetrics.uptime
      }
    });
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'access', label: '🔐 Access Logs' },
    { id: 'suspicious', label: '⚠️ Suspicious' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark">Real-time Monitoring</h2>
          <p className="text-sm text-gray-500 mt-1">
            System metrics, access logs, and security events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            wsConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {wsConnected ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Health Status */}
      {health && (
        <div className={`rounded-xl p-6 border-2 ${
          health.status === 'healthy' ? 'bg-green-50 border-green-200' :
          health.status === 'warning' ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              {health.status === 'healthy' ? '✅ System Healthy' :
               health.status === 'warning' ? '⚠️ System Warning' :
               '🚨 System Critical'}
            </h3>
            <div className="text-3xl font-bold">
              {health.health_score}/100
            </div>
          </div>
          
          {health.issues.length > 0 && (
            <div className="space-y-2">
              {health.issues.map((issue, idx) => (
                <div key={idx} className={`text-sm px-3 py-2 rounded ${
                  issue.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {issue.severity === 'critical' ? '🚨' : '⚠️'} {issue.type.toUpperCase()} - 
                  {issue.type === 'disk' ? ` ${issue.mount}` : ''} {issue.value}%
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <MetricCard
            title="CPU Usage"
            value={`${metrics.cpu?.usage_percent || 0}%`}
            icon="🖥️"
            color={getUsageColor(metrics.cpu?.usage_percent)}
            details={`${metrics.cpu?.cores} cores • ${metrics.cpu?.load_average?.join(', ')}`}
          />

          {/* Memory */}
          <MetricCard
            title="Memory"
            value={`${metrics.memory?.usage_percent || 0}%`}
            icon="💾"
            color={getUsageColor(metrics.memory?.usage_percent)}
            details={`${formatBytes(metrics.memory?.used)} / ${formatBytes(metrics.memory?.total)}`}
          />

          {/* Disk */}
          <MetricCard
            title="Disk"
            value={`${metrics.disk?.[0]?.usage_percent || 0}%`}
            icon="💿"
            color={getUsageColor(metrics.disk?.[0]?.usage_percent)}
            details={metrics.disk?.[0]?.mount_point || '/'}
          />

          {/* Uptime */}
          <MetricCard
            title="Uptime"
            value={metrics.uptime?.formatted || 'N/A'}
            icon="⏱️"
            color="text-blue-600"
            details={`Boot: ${new Date(metrics.uptime?.boot_time).toLocaleString()}`}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Network Interfaces */}
          {metrics?.network && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">🌐 Network Interfaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(metrics.network.interface_stats || {}).map(([iface, stats]) => (
                  <div key={iface} className="bg-gray-50 rounded-lg p-4">
                    <div className="font-medium mb-2">{iface}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">RX:</span> {formatBytes(stats.rx_bytes)}
                      </div>
                      <div>
                        <span className="text-gray-500">TX:</span> {formatBytes(stats.tx_bytes)}
                      </div>
                      <div>
                        <span className="text-gray-500">RX Packets:</span> {stats.rx_packets}
                      </div>
                      <div>
                        <span className="text-gray-500">TX Packets:</span> {stats.tx_packets}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Processes */}
          {metrics?.top_processes && metrics.top_processes.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">⚡ Top Processes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">PID</th>
                      <th className="px-4 py-2 text-left">Command</th>
                      <th className="px-4 py-2 text-right">CPU%</th>
                      <th className="px-4 py-2 text-right">MEM%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_processes.slice(0, 5).map((proc, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2 font-mono">{proc.pid}</td>
                        <td className="px-4 py-2 truncate max-w-xs">{proc.command}</td>
                        <td className="px-4 py-2 text-right">{proc.cpu_percent}%</td>
                        <td className="px-4 py-2 text-right">{proc.memory_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'access' && (
        <AccessLogsTable logs={accessLogs} />
      )}

      {activeTab === 'suspicious' && (
        <SuspiciousActivityTable activity={suspiciousActivity} />
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color, details }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{details}</div>
    </div>
  );
}

function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-2 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function AccessLogsTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">📋</div>
        <p>No access logs available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protocol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.slice(0, 50).map((log, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm font-mono">{log.source_ip}</td>
                <td className="px-6 py-4 text-sm">{log.port}</td>
                <td className="px-6 py-4 text-sm uppercase">{log.protocol}</td>
                <td className="px-6 py-4">
                  <StatusBadge 
                    status={log.action === 'allowed' ? 'active' : 'disabled'}
                    customStyles={{
                      active: 'bg-green-50 text-green-700',
                      disabled: 'bg-red-50 text-red-700'
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuspiciousActivityTable({ activity }) {
  if (!activity || activity.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">✅</div>
        <p>No suspicious activity detected</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-amber-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase">Risk Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase">Blocked</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase">Ports Targeted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activity.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{item.ip}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
                    item.risk_level === 'high' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.risk_level.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{item.blocked}</td>
                <td className="px-6 py-4 text-sm">{item.ports_targeted.join(', ')}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(item.last_seen).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getUsageColor(percent) {
  if (percent >= 90) return 'text-red-600';
  if (percent >= 70) return 'text-amber-600';
  return 'text-green-600';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
