/**
 * Modern Overview Dashboard Component
 * Redesigned with Google Material Design principles
 */

export default function ModernOverview({ stats }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Dashboard Overview</h2>
            <p className="text-blue-100 text-sm">Monitor your VPN service performance</p>
          </div>
          <div className="hidden sm:block">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥"
          value={stats?.total_users || 0}
          label="Total Users"
          gradient="from-blue-500 to-blue-600"
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
        <StatCard
          icon="🛡️"
          value={stats?.vpn_enabled_users || 0}
          label="Active VPN"
          gradient="from-green-500 to-green-600"
          bgColor="bg-green-50"
          textColor="text-green-600"
        />
        <StatCard
          icon="📱"
          value={stats?.active_devices || 0}
          label="Devices"
          gradient="from-purple-500 to-purple-600"
          bgColor="bg-purple-50"
          textColor="text-purple-600"
        />
        <StatCard
          icon="💰"
          value={formatCurrency(stats?.billing?.total_revenue || 0)}
          label="Revenue"
          gradient="from-amber-500 to-amber-600"
          bgColor="bg-amber-50"
          textColor="text-amber-600"
        />
      </div>

      {/* Revenue Stats */}
      <RevenueSection stats={stats} formatCurrency={formatCurrency} />

      {/* Order Status */}
      <OrderStatusSection stats={stats} />

      {/* Payment by Plan */}
      {stats?.billing?.payment_by_plan && Object.keys(stats.billing.payment_by_plan).length > 0 && (
        <PaymentByPlanSection stats={stats} formatCurrency={formatCurrency} />
      )}

      {/* Payment by Bank */}
      {stats?.billing?.payment_by_bank && Object.keys(stats.billing.payment_by_bank).length > 0 && (
        <PaymentByBankSection stats={stats} formatCurrency={formatCurrency} />
      )}

      {/* User Breakdown */}
      <UserBreakdownSection stats={stats} />
    </div>
  );
}

function StatCard({ icon, value, label, gradient, bgColor, textColor }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`${bgColor} w-12 h-12 rounded-xl flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${bgColor} ${textColor}`}>
          Today
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  );
}

function RevenueSection({ stats, formatCurrency }) {
  const BILLING_CONFIG = [
    { key: 'total_revenue', label: 'Total Revenue', icon: '💎', color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'this_month_revenue', label: 'This Month', icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'last_month_revenue', label: 'Last Month', icon: '📆', color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'average_payment', label: 'Avg Payment', icon: '📊', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Revenue Statistics</h3>
          <p className="text-sm text-gray-500 mt-0.5">Track your income and payments</p>
        </div>
        <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-sm font-medium">
          💵 IDR
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {BILLING_CONFIG.map((config) => {
          const value = stats?.billing?.[config.key] || 0;
          const displayValue = typeof value === 'number' ? formatCurrency(value) : value;
          
          return (
            <div key={config.key} className={`${config.bg} rounded-xl p-4 hover:shadow-md transition-shadow duration-200`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                  <span className="text-xl">{config.icon}</span>
                </div>
                <div className="text-xs text-gray-600 font-medium">{config.label}</div>
              </div>
              <div className={`text-xl font-bold ${config.color}`}>{displayValue}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderStatusSection({ stats }) {
  const ORDER_STATUS_CONFIG = [
    { key: 'total_orders', label: 'Total', icon: '📋', color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'approved_orders', label: 'Approved', icon: '✓', color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'pending_orders', label: 'Pending', icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'rejected_orders', label: 'Rejected', icon: '✕', color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'blocked_payments', label: 'Blocked', icon: '🚫', color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Order Status</h3>
          <p className="text-sm text-gray-500 mt-0.5">Track payment and service orders</p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-sm font-medium">
          📦 Orders
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ORDER_STATUS_CONFIG.map((config) => {
          const value = stats?.billing?.[config.key] || 0;
          
          return (
            <div key={config.key} className={`${config.bg} rounded-xl p-4 text-center hover:shadow-md transition-shadow duration-200`}>
              <div className={`text-3xl font-bold ${config.color} mb-1`}>{config.icon}</div>
              <div className={`text-2xl font-bold ${config.color} mb-0.5`}>{value}</div>
              <div className="text-xs text-gray-600 font-medium">{config.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentByPlanSection({ stats, formatCurrency }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Payment by Plan</h3>
          <p className="text-sm text-gray-500 mt-0.5">Revenue distribution across subscription plans</p>
        </div>
        <div className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full text-sm font-medium">
          📋 Plans
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats.billing.payment_by_plan).map(([plan, data]) => (
          <div key={plan} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl">
                {plan === 'monthly' && '📅'}
                {plan === 'quarterly' && '📆'}
                {plan === 'yearly' && '📅'}
                {plan === 'trial' && '🎁'}
              </div>
              <div className="text-xs text-gray-600 font-medium capitalize">{plan}</div>
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-1">{data.count} orders</div>
            <div className="text-sm text-purple-500 font-medium">{formatCurrency(data.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentByBankSection({ stats, formatCurrency }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
          <p className="text-sm text-gray-500 mt-0.5">Popular payment channels</p>
        </div>
        <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-sm font-medium">
          🏦 Banks
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats.billing.payment_by_bank).map(([bank, data]) => (
          <div key={bank} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl">
                {bank.includes('bca') && '🏦'}
                {bank.includes('bni') && '🏦'}
                {bank.includes('mandiri') && '🏦'}
                {bank.includes('bri') && '🏦'}
                {bank.includes('gopay') && '📱'}
                {bank.includes('ovo') && '📱'}
                {bank.includes('dana') && '📱'}
                {bank.includes('shopeepay') && '🛒'}
              </div>
              <div className="text-xs text-gray-600 font-medium capitalize">{bank}</div>
            </div>
            <div className="text-2xl font-bold text-amber-600 mb-1">{data.count} payments</div>
            <div className="text-sm text-amber-500 font-medium">{formatCurrency(data.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserBreakdownSection({ stats }) {
  const BREAKDOWN_CONFIG = [
    { key: 'admin', label: 'Admin Users', icon: '👑', color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'user', label: 'Regular Users', icon: '👤', color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const VPN_STATUS_CONFIG = [
    { key: 'enabled', label: 'VPN Enabled', icon: '✓', color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'disabled', label: 'VPN Disabled', icon: '✕', color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* User Role Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">User Roles</h3>
            <p className="text-sm text-gray-500 mt-0.5">Distribution by account type</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-sm font-medium">
            👥 Roles
          </div>
        </div>
        <div className="space-y-3">
          {BREAKDOWN_CONFIG.map((config) => {
            const value = stats?.users_by_role?.[config.key] || 0;
            const total = stats?.total_users || 1;
            const percentage = Math.round((value / total) * 100);
            
            return (
              <div key={config.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${config.key === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VPN Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">VPN Status</h3>
            <p className="text-sm text-gray-500 mt-0.5">Active vs disabled VPN access</p>
          </div>
          <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-sm font-medium">
            🛡️ VPN
          </div>
        </div>
        <div className="space-y-3">
          {VPN_STATUS_CONFIG.map((config) => {
            const value = stats?.users_by_vpn_status?.[config.key] || 0;
            const total = stats?.total_users || 1;
            const percentage = Math.round((value / total) * 100);
            
            return (
              <div key={config.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${config.key === 'enabled' ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
