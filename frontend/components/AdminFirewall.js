import { useState, useEffect } from 'react';
import { adminFirewallAPI, adminDepartmentsAPI } from '../lib/api';
import { useUIStore } from '../store';
import { StatusBadge } from './admin';
import BlockedPortsSettings from './admin/BlockedPortsSettings';

// Blocked ports that cannot be used
const BLOCKED_PORTS = [
  { port: 51820, reason: 'WireGuard VPN port', level: 'danger' },
  { port: 443, reason: 'HTTPS server port', level: 'danger' },
  { port: 80, reason: 'HTTP server port', level: 'danger' },
  { port: 22, reason: 'SSH port', level: 'warning' },
];

export default function AdminFirewall({ token }) {
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [ipUsage, setIpUsage] = useState({});
  const [openPorts, setOpenPorts] = useState([]);
  const [systemPorts, setSystemPorts] = useState(null);
  const [publicPorts, setPublicPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [iptablesStatus, setIptablesStatus] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [portValidation, setPortValidation] = useState(null);
  const [selectedRules, setSelectedRules] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [firewallSubTab, setFirewallSubTab] = useState('rules'); // 'rules' or 'blocked-ports'
  const { showNotification } = useUIStore();

  const [formData, setFormData] = useState({
    name: '',
    port: '',
    protocol: 'tcp',
    ip_type: 'range',
    ip_range: '',
    ips: [],
    department_id: '',
    action: 'allow',
    description: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRules(),
      fetchIptablesStatus(),
      fetchDevices(),
      fetchIPUsage(),
      fetchOpenPorts(),
      fetchSystemPorts(),
      fetchPublicPorts(),
      fetchDepartments()
    ]);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const data = await adminDepartmentsAPI.getDepartments();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const data = await adminFirewallAPI.getRules();
      setRules(data.rules || []);
    } catch (error) {
      showNotification('Failed to load firewall rules', 'error');
    }
  };

  const fetchIptablesStatus = async () => {
    try {
      const data = await adminFirewallAPI.getStatus();
      setIptablesStatus(data.status);
    } catch (error) {
      console.error('Failed to get iptables status:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const data = await adminFirewallAPI.getDevices();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const fetchIPUsage = async () => {
    try {
      const data = await adminFirewallAPI.getIPUsage();
      setIpUsage(data.ip_usage || {});
    } catch (error) {
      console.error('Failed to load IP usage:', error);
    }
  };

  const fetchOpenPorts = async () => {
    try {
      const data = await adminFirewallAPI.getOpenPorts();
      setOpenPorts(data.open_ports || []);
    } catch (error) {
      console.error('Failed to load open ports:', error);
    }
  };

  const fetchSystemPorts = async () => {
    try {
      const data = await adminFirewallAPI.getSystemPorts();
      setSystemPorts(data);
    } catch (error) {
      console.error('Failed to scan system ports:', error);
    }
  };

  const fetchPublicPorts = async () => {
    try {
      const data = await adminFirewallAPI.getPublicPorts();
      setPublicPorts(data.public_ports || []);
    } catch (error) {
      console.error('Failed to load public ports:', error);
    }
  };

  const validatePort = async (port) => {
    try {
      const result = await adminFirewallAPI.validatePort(port);
      setPortValidation(result);
      return result;
    } catch (error) {
      console.error('Port validation error:', error);
      return null;
    }
  };

  const validateSelectedIPs = async (ips) => {
    try {
      const result = await adminFirewallAPI.validateIPs({
        ips,
        ip_type: 'individual'
      });
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      return null;
    }
  };

  const validateIPRange = async (ipRange) => {
    try {
      const result = await adminFirewallAPI.validateIPs({
        ip_range: ipRange,
        ip_type: 'range'
      });
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      return null;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-validate port
    if (name === 'port' && value) {
      validatePort(value);
    }
    
    // Auto-validate on change
    if (name === 'ip_range' && formData.ip_type === 'range' && value.includes('-')) {
      validateIPRange(value);
    } else if (name === 'ips' && formData.ip_type === 'individual') {
      validateSelectedIPs(value);
    } else if (name === 'department_id' && formData.ip_type === 'department' && value) {
      // Validate department IPs
      validateDepartmentIPs(value);
    }
  };

  const validateDepartmentIPs = async (departmentId) => {
    try {
      const result = await adminFirewallAPI.getDepartmentIPs(departmentId);
      const ips = result.ips || [];
      if (ips.length > 0) {
        await validateSelectedIPs(ips);
      }
    } catch (error) {
      console.error('Department IP validation error:', error);
    }
  };

  const handleIPTypeChange = (type) => {
    setFormData(prev => ({ 
      ...prev, 
      ip_type: type,
      ips: [],
      ip_range: '',
      department_id: ''
    }));
    setValidationResult(null);
  };

  const handleDeviceIPToggle = async (ip) => {
    const newIPs = formData.ips.includes(ip)
      ? formData.ips.filter(i => i !== ip)
      : [...formData.ips, ip];
    
    setFormData(prev => ({ ...prev, ips: newIPs }));
    
    // Validate after toggle
    if (newIPs.length > 0) {
      await validateSelectedIPs(newIPs);
    }
  };

  const handleSelectAllDevices = async () => {
    const allIPs = devices.map(d => d.ip_address);
    setFormData(prev => ({ ...prev, ips: allIPs }));
    await validateSelectedIPs(allIPs);
  };

  const handleClearSelection = () => {
    setFormData(prev => ({ ...prev, ips: [] }));
    setValidationResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.port) {
      showNotification('Name and port are required', 'error');
      return;
    }

    const portNum = parseInt(formData.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      showNotification('Port must be between 1 and 65535', 'error');
      return;
    }

    // Check if port is blocked
    if (portValidation?.blocked) {
      showNotification(`Port ${portNum} is blocked: ${portValidation.reason}`, 'error');
      return;
    }

    // Validate IP selection
    if (formData.ip_type === 'range') {
      const ipRangePattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}-\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (!ipRangePattern.test(formData.ip_range)) {
        showNotification('IP range must be in format: 10.0.0.3-10.0.0.10', 'error');
        return;
      }
    } else if (formData.ip_type === 'individual') {
      if (!formData.ips || formData.ips.length === 0) {
        showNotification('Please select at least one IP address', 'error');
        return;
      }
    } else if (formData.ip_type === 'department') {
      if (!formData.department_id) {
        showNotification('Please select a department', 'error');
        return;
      }
    }

    // Check for overlaps and warn user
    if (validationResult?.has_overlap) {
      const overlapIPs = validationResult.overlaps.map(o => 
        `${o.ip} (used by: ${o.existing_rule.rule_name})`
      ).join(', ');
      
      const confirm = window.confirm(
        `⚠️ IP Overlap Warning!\n\n` +
        `The following IPs are already used by other rules:\n${overlapIPs}\n\n` +
        `Do you want to proceed anyway? (Only non-overlapping IPs will be added)`
      );
      
      if (!confirm) return;
    }

    try {
      const submitData = {
        name: formData.name,
        port: portNum,
        protocol: formData.protocol,
        ip_type: formData.ip_type,
        action: formData.action,
        description: formData.description,
        allow_overlap: validationResult?.has_overlap || false
      };

      if (formData.ip_type === 'range') {
        submitData.ip_range = formData.ip_range;
      } else if (formData.ip_type === 'department') {
        submitData.department_id = formData.department_id;
      } else {
        submitData.ips = formData.ips;
      }

      if (editingRule) {
        await adminFirewallAPI.updateRule(editingRule.id, submitData);
        showNotification('Firewall rule updated successfully');
      } else {
        await adminFirewallAPI.createRule(submitData);
        showNotification('Firewall rule created successfully');
      }
      
      resetForm();
      fetchAllData();
    } catch (error) {
      showNotification(error.message || 'Failed to save firewall rule', 'error');
    }
  };

  const handleEdit = (rule) => {
    setFormData({
      name: rule.name,
      port: rule.port.toString(),
      protocol: rule.protocol,
      ip_type: rule.ip_type || 'range',
      ip_range: rule.ip_type === 'range' ? rule.ip_range : '',
      ips: rule.ip_type === 'individual' ? (rule.ips || []) : [],
      department_id: rule.ip_type === 'department' ? rule.department_id : '',
      action: rule.action,
      description: rule.description || '',
    });
    setEditingRule(rule);
    setShowForm(true);
    // Validate existing port
    validatePort(rule.port);
  };

  const fetchDeleteImpact = async (ruleId) => {
    try {
      const impact = await adminFirewallAPI.getDeleteImpact(ruleId);
      setDeleteImpact(impact);
    } catch (error) {
      console.error('Failed to get delete impact:', error);
    }
  };

  const handleDeleteClick = async (ruleId) => {
    await fetchDeleteImpact(ruleId);
    setRuleToDelete(ruleId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    
    try {
      await adminFirewallAPI.deleteRule(ruleToDelete);
      showNotification('Firewall rule deleted successfully');
      fetchAllData();
      setShowDeleteConfirm(false);
      setDeleteImpact(null);
      setRuleToDelete(null);
    } catch (error) {
      showNotification('Failed to delete firewall rule', 'error');
    }
  };

  const handleToggle = async (ruleId, currentEnabled) => {
    try {
      await adminFirewallAPI.toggleRule(ruleId);
      showNotification(`Firewall rule ${currentEnabled ? 'disabled' : 'enabled'} successfully`);
      fetchAllData();
    } catch (error) {
      showNotification('Failed to toggle firewall rule', 'error');
    }
  };

  const handleSync = async () => {
    try {
      const result = await adminFirewallAPI.syncRules();
      showNotification(`Firewall rules synced: ${result.synced}/${result.total_rules} successful`);
      fetchAllData();
    } catch (error) {
      showNotification('Failed to sync firewall rules', 'error');
    }
  };

  const handleSelectRule = (ruleId) => {
    setSelectedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleSelectAllRules = () => {
    if (selectedRules.length === rules.length) {
      setSelectedRules([]);
    } else {
      setSelectedRules(rules.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRules.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const result = await adminFirewallAPI.bulkDelete({
        rule_ids: selectedRules
      });
      
      showNotification(
        `Bulk delete completed: ${result.results.deleted.length} deleted, ${result.results.failed.length} failed`,
        result.results.failed.length > 0 ? 'warning' : 'success'
      );
      
      setSelectedRules([]);
      fetchAllData();
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      showNotification('Failed to bulk delete: ' + error.message, 'error');
    }
  };

  const handleBulkDeletePublicPorts = async () => {
    if (publicPorts.length === 0) return;
    
    const confirm = window.confirm(
      `⚠️ WARNING: This will delete ALL firewall rules for ${publicPorts.length} port(s) that are open to public!\n\n` +
      `Ports: ${publicPorts.map(p => p.port).join(', ')}\n\n` +
      `This will expose these ports to anywhere (0.0.0.0/0). Continue?`
    );
    
    if (!confirm) return;
    
    try {
      const portsToDelete = [...new Set(publicPorts.map(p => p.port))];
      const result = await adminFirewallAPI.bulkDelete({
        ports: portsToDelete
      });
      
      showNotification(
        `Bulk delete completed: ${result.results.deleted.length} deleted, ${result.results.failed.length} failed`,
        result.results.failed.length > 0 ? 'warning' : 'success'
      );
      
      fetchAllData();
    } catch (error) {
      showNotification('Failed to bulk delete public ports: ' + error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      port: '',
      protocol: 'tcp',
      ip_type: 'range',
      ip_range: '',
      ips: [],
      department_id: '',
      action: 'allow',
      description: '',
    });
    setEditingRule(null);
    setShowForm(false);
    setValidationResult(null);
    setPortValidation(null);
  };

  const isIPUsed = (ip) => {
    return !!ipUsage[ip];
  };

  const getIPUsageInfo = (ip) => {
    return ipUsage[ip];
  };

  const getBlockedPortInfo = (port) => {
    return BLOCKED_PORTS.find(bp => bp.port === port);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-dark">Firewall Management</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFirewallSubTab('rules')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  firewallSubTab === 'rules'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📋 Rules
              </button>
              <button
                onClick={() => setFirewallSubTab('blocked-ports')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  firewallSubTab === 'blocked-ports'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🔒 Blocked Ports
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {firewallSubTab === 'rules' 
              ? 'Manage port access rules by IP range, individual IPs, or department'
              : 'Configure which ports are protected and cannot be used in firewall rules'}
          </p>
        </div>
        {firewallSubTab === 'rules' && (
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              🔄 Sync Rules
            </button>
            {selectedRules.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                🗑️ Delete ({selectedRules.length})
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {showForm ? '❌ Cancel' : '➕ Add Rule'}
            </button>
          </div>
        )}
      </div>

      {/* Show Blocked Ports Settings or Firewall Rules */}
      {firewallSubTab === 'blocked-ports' && <BlockedPortsSettings />}
      
      {firewallSubTab === 'rules' && (
        <>
          {/* Blocked Ports Warning */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚫</div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-800 mb-2">
              ⚠️ Blocked Ports - Cannot Be Used
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BLOCKED_PORTS.map((bp) => (
                <div key={bp.port} className={`text-xs p-2 rounded ${
                  bp.level === 'danger' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <div className="font-bold">Port {bp.port}</div>
                  <div className="text-xs opacity-80">{bp.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Port Analysis - Public Ports Warning */}
      {systemPorts && systemPorts.unprotected_ports && systemPorts.unprotected_ports.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚨</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800 mb-2">
                🚨 CRITICAL: Ports Open to Public Without Firewall Protection
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                {systemPorts.unprotected_ports.map((port, idx) => (
                  <div key={idx} className="bg-red-100 text-red-700 rounded p-2 text-xs">
                    <div className="font-bold">Port {port.port} ({port.protocol})</div>
                    <div className="mt-1">{port.reason}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-600">
                These ports are listening on 0.0.0.0 and accessible from anywhere without firewall protection!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Public Ports Section */}
      {publicPorts && publicPorts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-800 mb-2">
                  🌍 Ports Open to Public (0.0.0.0/0)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {publicPorts.map((port, idx) => (
                    <div key={idx} className="bg-amber-100 text-amber-700 rounded p-2 text-xs">
                      <div className="font-bold">Port {port.port}</div>
                      <div className="text-xs opacity-80">{port.protocol} • {port.risk === 'high' ? '🚨 High Risk' : '⚠️ Medium Risk'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleBulkDeletePublicPorts}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 whitespace-nowrap"
            >
              🗑️ Delete All
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* iptables Status */}
        {iptablesStatus && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${iptablesStatus.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <div className="text-sm font-semibold text-dark">iptables Status</div>
                  <div className="text-xs text-gray-500">
                    Chain: {iptablesStatus.chain}
                  </div>
                </div>
              </div>
              <StatusBadge status={iptablesStatus.status} />
            </div>
            <div className="text-xs text-gray-500">
              Rules: {iptablesStatus.rule_count} • IPs Protected: {Object.keys(ipUsage).length}
            </div>
          </div>
        )}

        {/* System Ports Summary */}
        {systemPorts && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-dark mb-3">🔍 System Port Analysis</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{systemPorts.summary.restricted_count}</div>
                <div className="text-xs text-gray-500">Restricted</div>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded">
                <div className="text-lg font-bold text-amber-600">{systemPorts.summary.public_count}</div>
                <div className="text-xs text-gray-500">Public</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-lg font-bold text-red-600">{systemPorts.summary.unprotected_count}</div>
                <div className="text-xs text-gray-500">Unprotected</div>
              </div>
            </div>
          </div>
        )}

        {/* Firewall Rules Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-dark mb-3">📡 Firewall Rules ({openPorts.length})</h3>
          {openPorts.length === 0 ? (
            <p className="text-xs text-gray-500">No open ports from firewall rules</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {openPorts.slice(0, 8).map((openPort) => (
                <div key={openPort.port} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200">
                  <div className="font-medium">Port {openPort.port}</div>
                  <div className="text-xs opacity-70">{openPort.protocols.join(',')} • {openPort.rule_count} rules</div>
                </div>
              ))}
              {openPorts.length > 8 && (
                <div className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded">
                  +{openPorts.length - 8} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-dark mb-4">
            {editingRule ? 'Edit Firewall Rule' : 'Add New Firewall Rule'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Allow SSH from Office"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="port"
                  value={formData.port}
                  onChange={handleInputChange}
                  placeholder="e.g., 3000"
                  min="1"
                  max="65535"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
                {portValidation && (
                  <div className={`mt-2 p-2 rounded-lg text-xs ${
                    portValidation.blocked 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : portValidation.valid
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    {portValidation.blocked ? (
                      <div className="font-medium">🚫 Port {portValidation.port} is blocked</div>
                    ) : portValidation.valid ? (
                      <div className="font-medium">✅ Port {portValidation.port} is available</div>
                    ) : null}
                    {portValidation.reason && (
                      <div className="mt-1">{portValidation.reason}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protocol
                </label>
                <select
                  name="protocol"
                  value={formData.protocol}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="both">Both (TCP + UDP)</option>
                </select>
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  name="action"
                  value={formData.action}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
            </div>

            {/* IP Selection Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP Selection Method <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleIPTypeChange('range')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.ip_type === 'range'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📍 IP Range
                </button>
                <button
                  type="button"
                  onClick={() => handleIPTypeChange('individual')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.ip_type === 'individual'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ✓ Individual IPs
                </button>
                <button
                  type="button"
                  onClick={() => handleIPTypeChange('department')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.ip_type === 'department'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🏢 Department
                </button>
              </div>

              {/* Department Selection */}
              {formData.ip_type === 'department' && (
                <div>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="">Select a department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.device_count} devices)
                      </option>
                    ))}
                  </select>
                  {formData.department_id && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <div className="font-medium text-blue-800">
                        📋 Selected: {departments.find(d => d.id === formData.department_id)?.name}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        This will apply the rule to all {departments.find(d => d.id === formData.department_id)?.device_count || 0} devices in this department
                      </div>
                    </div>
                  )}
                  {departments.length === 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      ⚠️ No departments found. Create a department first in the Departments tab.
                    </div>
                  )}
                </div>
              )}

              {/* IP Range Input */}
              {formData.ip_type === 'range' && (
                <div>
                  <input
                    type="text"
                    name="ip_range"
                    value={formData.ip_range}
                    onChange={handleInputChange}
                    placeholder="e.g., 10.0.0.3-10.0.0.10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: start_ip-end_ip
                  </p>
                  {validationResult && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${
                      validationResult.has_overlap 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      <div className="font-medium mb-1">
                        {validationResult.has_overlap ? '⚠️ Overlap Detected' : '✅ No Overlap'}
                      </div>
                      <div>Total IPs: {validationResult.total_ips} | Available: {validationResult.available_ips}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Individual IP Selection */}
              {formData.ip_type === 'individual' && (
                <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Select from active devices ({formData.ips?.length || 0} selected)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllDevices}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  {devices.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No active devices found</p>
                  ) : (
                    <div className="space-y-2">
                      {devices.map((device) => {
                        const isUsed = isIPUsed(device.ip_address);
                        const usageInfo = getIPUsageInfo(device.ip_address);
                        const isChecked = formData.ips?.includes(device.ip_address);
                        
                        return (
                          <label
                            key={device.id}
                            className={`flex items-center gap-3 p-2 rounded transition-colors ${
                              isUsed && !isChecked
                                ? 'bg-red-50 cursor-not-allowed'
                                : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked || false}
                              onChange={() => !isUsed && handleDeviceIPToggle(device.ip_address)}
                              disabled={isUsed && !isChecked}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-dark">{device.ip_address}</span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-sm text-gray-700">{device.device_name}</span>
                                {isUsed && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                                    Used by: {usageInfo.rule_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">{device.user_email}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional description for this rule"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={portValidation?.blocked}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  portValidation?.blocked
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteImpact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-dark mb-4">⚠️ Confirm Delete</h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">Are you sure you want to delete this rule?</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 mb-2">Rule: {deleteImpact.rule_name}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">IPs that will be freed:</span>
                    <span className="font-medium text-red-600">{deleteImpact.affected_ip_count} IPs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Devices affected:</span>
                    <span className="font-medium text-red-600">{deleteImpact.affected_device_count} devices</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-dark mb-4">🗑️ Confirm Bulk Delete</h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete {selectedRules.length} selected rule(s)?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-sm text-amber-800">
                  This action cannot be undone. All selected firewall rules will be permanently removed.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              <button onClick={confirmBulkDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-dark">Firewall Rules</h3>
            {selectedRules.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm font-medium text-red-700">
                  {selectedRules.length} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                >
                  🗑️ Delete Selected
                </button>
                <button
                  onClick={() => setSelectedRules([])}
                  className="px-2 py-1 text-red-600 hover:bg-red-100 rounded text-xs"
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedRules.length === rules.length && rules.length > 0}
              onChange={handleSelectAllRules}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-xs text-gray-500">Select All</span>
          </div>
        </div>
        <RulesTable
          rules={rules}
          selectedRules={selectedRules}
          onSelect={handleSelectRule}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onToggle={handleToggle}
        />
      </div>
        </>
      )}
    </div>
  );
}

function RulesTable({ rules, selectedRules, onSelect, onEdit, onDelete, onToggle }) {
  const columns = [
    {
      key: 'select',
      label: '',
      sortable: false,
      render: (rule) => (
        <input
          type="checkbox"
          checked={selectedRules.includes(rule.id)}
          onChange={() => onSelect(rule.id)}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
      ),
    },
    {
      key: 'name',
      label: 'Rule Name',
      sortable: true,
      render: (rule) => (
        <div>
          <div className="font-medium text-dark">{rule.name}</div>
          {rule.description && (
            <div className="text-xs text-gray-500 truncate max-w-xs">{rule.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'port',
      label: 'Port',
      sortable: true,
      render: (rule) => (
        <span className="font-mono text-sm text-gray-600">{rule.port}</span>
      ),
    },
    {
      key: 'protocol',
      label: 'Protocol',
      sortable: true,
      render: (rule) => (
        <span className="text-sm text-gray-600 uppercase">{rule.protocol}</span>
      ),
    },
    {
      key: 'ip_range',
      label: 'IP Selection',
      sortable: true,
      render: (rule) => (
        <div>
          <div className="font-mono text-sm text-dark">
            {rule.ip_type === 'individual'
              ? `${rule.ips?.length || 0} IPs`
              : rule.ip_type === 'department'
              ? `🏢 ${rule.ip_range.replace('Department: ', '')}`
              : rule.ip_range
            }
          </div>
          <div className="text-xs text-gray-500">
            {rule.ip_count} IPs
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (rule) => (
        <span className={`text-sm font-medium ${rule.action === 'allow' ? 'text-green-600' : 'text-red-600'}`}>
          {rule.action === 'allow' ? '✓ Allow' : '✗ Deny'}
        </span>
      ),
    },
    {
      key: 'enabled',
      label: 'Status',
      sortable: true,
      render: (rule) => (
        <StatusBadge status={rule.enabled ? 'active' : 'disabled'} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (rule) => (
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(rule.id, rule.enabled)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              rule.enabled
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (rules.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">🛡️</div>
        <p>No firewall rules configured</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rules.map((rule) => (
            <tr key={rule.id} className={`hover:bg-gray-50 transition-colors ${selectedRules.includes(rule.id) ? 'bg-blue-50' : ''}`}>
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                  {col.render(rule)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
