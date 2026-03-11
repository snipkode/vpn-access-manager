import { useState, useEffect, useRef, useMemo } from 'react';
import { adminFirewallAPI, adminMonitoringAPI } from '../lib/api';
import { useUIStore } from '../store';
import { StatusBadge } from './admin';
import { DataTable } from './admin';

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
    
    // For production with stunnel, use same host but different protocol
    const isHttps = apiUrl.startsWith('https://');
    const apiHost = apiUrl.replace('http://', '').replace('https://', '').replace('/api', '');
    
    // Try WSS first (production), fallback to WS (development)
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${apiHost}/ws/monitoring`;
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    // Alternative: Direct backend connection for development
    const directWsUrl = 'ws://localhost:5000/ws/monitoring';

    try {
      // Try proxy URL first
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
        
        // If WSS fails, try direct WS connection (for development)
        if (wsUrl.includes('wss://') && wsUrl !== directWsUrl) {
          console.log('🔄 WSS failed, trying direct WS connection...');
          setTimeout(() => {
            console.log('🔌 Connecting to direct WebSocket:', directWsUrl);
            try {
              wsRef.current = new WebSocket(directWsUrl);
              // Re-setup handlers (simplified for fallback)
              wsRef.current.onopen = () => {
                console.log('✅ Direct WebSocket connected');
                setWsConnected(true);
              };
              wsRef.current.onclose = () => {
                console.log('🔌 Direct WebSocket disconnected');
                setWsConnected(false);
                setTimeout(connectWebSocket, 5000);
              };
              wsRef.current.onerror = () => {
                console.error('❌ Direct WebSocket error');
                setWsConnected(false);
              };
            } catch (e) {
              console.error('❌ Failed to connect direct WebSocket:', e);
            }
          }, 1000);
        }
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
  const columns = useMemo(() => [
    {
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (log) => (
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
        </div>
      ),
    },
    {
      key: 'source_ip',
      label: 'Source IP',
      sortable: true,
      render: (log) => (
        <div className="text-sm font-mono text-dark whitespace-nowrap">
          {log.source_ip}
        </div>
      ),
    },
    {
      key: 'port',
      label: 'Port',
      sortable: true,
      render: (log) => (
        <div className="text-sm font-mono whitespace-nowrap">
          {log.port}
        </div>
      ),
    },
    {
      key: 'protocol',
      label: 'Protocol',
      sortable: true,
      render: (log) => (
        <div className="text-sm uppercase text-gray-600 whitespace-nowrap">
          {log.protocol}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (log) => (
        <div className="whitespace-nowrap">
          <StatusBadge
            status={log.action === 'allowed' ? 'active' : 'disabled'}
            customStyles={{
              active: 'bg-green-50 text-green-700',
              disabled: 'bg-red-50 text-red-700'
            }}
          />
        </div>
      ),
    },
  ], []);

  const headerContent = (
    <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <span className="text-lg">📋</span>
        <span>
          Showing <strong>{logs?.length || 0}</strong> recent access log entries
        </span>
      </div>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={logs || []}
      itemsPerPage={20}
      emptyMessage="No access logs available"
      headerContent={headerContent}
      searchable={true}
      searchKeys={['source_ip', 'port', 'protocol', 'action']}
      sortable={true}
      mobileCardView={true}
      renderCard={(log) => (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-mono text-sm text-dark">{log.source_ip}</div>
              <div className="text-xs text-gray-400">Port: {log.port} • {log.protocol?.toUpperCase()}</div>
            </div>
            <StatusBadge
              status={log.action === 'allowed' ? 'active' : 'disabled'}
              customStyles={{
                active: 'bg-green-50 text-green-700',
                disabled: 'bg-red-50 text-red-700'
              }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
          </div>
        </div>
      )}
    />
  );
}

function SuspiciousActivityTable({ activity }) {
  const columns = useMemo(() => [
    {
      key: 'ip',
      label: 'IP Address',
      sortable: true,
      render: (item) => (
        <div className="text-sm font-mono text-dark whitespace-nowrap">
          {item.ip}
        </div>
      ),
    },
    {
      key: 'risk_level',
      label: 'Risk Level',
      sortable: true,
      render: (item) => (
        <div className="whitespace-nowrap">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
            item.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
            item.risk_level === 'high' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {item.risk_level.toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: 'blocked',
      label: 'Blocked',
      sortable: true,
      render: (item) => (
        <div className="text-sm font-bold text-dark whitespace-nowrap">
          {item.blocked || 0}
        </div>
      ),
    },
    {
      key: 'ports_targeted',
      label: 'Ports Targeted',
      sortable: true,
      render: (item) => (
        <div className="text-sm font-mono text-gray-600 whitespace-nowrap max-w-xs truncate">
          {item.ports_targeted?.join(', ') || 'N/A'}
        </div>
      ),
    },
    {
      key: 'last_seen',
      label: 'Last Seen',
      sortable: true,
      render: (item) => (
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {item.last_seen ? new Date(item.last_seen).toLocaleString() : 'N/A'}
        </div>
      ),
    },
  ], []);

  const headerContent = (
    <div className="bg-amber-50 border-b border-amber-100 px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-amber-700">
        <span className="text-lg">⚠️</span>
        <span>
          <strong>{activity?.length || 0}</strong> suspicious IP{activity?.length !== 1 ? 's' : ''} detected
        </span>
      </div>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={activity || []}
      itemsPerPage={15}
      emptyMessage="No suspicious activity detected"
      headerContent={headerContent}
      searchable={true}
      searchKeys={['ip', 'risk_level', 'ports_targeted']}
      sortable={true}
      mobileCardView={true}
      renderCard={(item) => (
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-mono text-sm text-dark">{item.ip}</div>
              <div className="text-xs text-gray-400">
                {item.ports_targeted?.length || 0} port{item.ports_targeted?.length !== 1 ? 's' : ''} targeted
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              item.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
              item.risk_level === 'high' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {item.risk_level.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Blocked</div>
              <div className="font-bold text-dark">{item.blocked || 0}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-400">Last Seen</div>
              <div className="text-dark">
                {item.last_seen ? new Date(item.last_seen).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    />
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
