import { useEffect, useState, useMemo } from 'react';
import { useUIStore } from '../store';
import { adminReferralAPI, formatCurrency } from '../lib/api';
import { DataTable, StatCard } from './admin';

export default function AdminReferral({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, eventsData, configData] = await Promise.all([
        adminReferralAPI.getStats(),
        adminReferralAPI.getEvents({ limit: 100 }),
        adminReferralAPI.getConfig(),
      ]);
      setStats(statsData.stats || null);
      setReferrals(eventsData.events || []);
      setConfig(configData.config || null);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      showNotification('Failed to load referral data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTier = async (userId, newTier) => {
    try {
      // Get user data first
      const userData = await adminReferralAPI.getUser(userId);
      const currentData = userData.user || {};
      
      // Update tier via config (backend doesn't have direct tier update endpoint)
      await adminReferralAPI.updateConfig({
        user_id: userId,
        tier: newTier,
        action: 'update_tier'
      });
      
      showNotification('User tier updated');
      fetchData();
    } catch (error) {
      console.error('Failed to update tier:', error);
      showNotification(error.message || 'Failed to update tier', 'error');
    }
  };

  const handleResetFraud = async (userId) => {
    if (!confirm('Reset fraud flags for this user?')) return;
    try {
      // Backend doesn't have reset-fraud endpoint, use config update
      await adminReferralAPI.updateConfig({
        user_id: userId,
        action: 'reset_fraud'
      });
      showNotification('Fraud flags reset');
      fetchData();
    } catch (error) {
      console.error('Failed to reset fraud:', error);
      showNotification(error.message || 'Failed to reset fraud flags', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Referrers"
            value={stats.total_referrers || 0}
            color="text-purple-500"
            bg="bg-purple-50"
          />
          <StatCard
            label="Total Referrals"
            value={stats.total_referrals || 0}
            color="text-blue-500"
            bg="bg-blue-50"
          />
          <StatCard
            label="Active Referrals"
            value={stats.active_referrals || 0}
            color="text-success"
            bg="bg-green-50"
          />
          <StatCard
            label="Total Payouts"
            value={formatCurrency(stats.total_payouts || 0)}
            color="text-primary"
            bg="bg-primary/10"
          />
          <StatCard
            label="Fraud Alerts"
            value={stats.fraud_alerts || 0}
            color="text-red-500"
            bg="bg-red-50"
          />
        </div>
      )}

      {/* Config Info */}
      {config && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-dark mb-4">Referral Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ConfigItem label="Referrer Reward" value={formatCurrency(config.referrer_reward || 0)} />
            <ConfigItem label="Referee Reward" value={formatCurrency(config.referee_reward || 0)} />
            <ConfigItem label="Min for Tier 2" value={`${config.tiers?.tier_2?.min_referrals || 0} referrals`} />
            <ConfigItem label="Min for Tier 3" value={`${config.tiers?.tier_3?.min_referrals || 0} referrals`} />
          </div>
        </div>
      )}

      {/* Referrals List */}
      <ReferralsTable
        referrals={referrals}
        onView={setSelectedReferral}
        onResetFraud={handleResetFraud}
      />

      {/* Detail Modal */}
      {selectedReferral && (
        <ReferralDetailModal
          referral={selectedReferral}
          onClose={() => setSelectedReferral(null)}
          onUpdateTier={handleToggleTier}
        />
      )}
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-dark">{value}</div>
    </div>
  );
}

function TierBadge({ tier }) {
  const tiers = {
    tier_1: { name: 'Bronze', color: 'bg-amber-100 text-amber-700' },
    tier_2: { name: 'Silver', color: 'bg-gray-100 text-gray-700' },
    tier_3: { name: 'Gold', color: 'bg-yellow-100 text-yellow-700' },
  };
  const tierInfo = tiers[tier] || { name: tier || 'N/A', color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tierInfo.color}`}>
      {tierInfo.name}
    </span>
  );
}

function ReferralDetailModal({ referral, onClose, onUpdateTier }) {
  const [showTierSelect, setShowTierSelect] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-dark">Referral Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-dark text-xl p-1 transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="User Email" value={referral.user_email} />
            <InfoRow label="Referral Code" value={referral.referral_code} />
          </div>

          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-sm text-purple-600 mb-2">Current Tier</div>
            <div className="flex justify-between items-center">
              <TierBadge tier={referral.tier} />
              <button
                onClick={() => setShowTierSelect(!showTierSelect)}
                className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
              >
                Change Tier
              </button>
            </div>
          </div>

          {showTierSelect && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="text-sm font-semibold text-dark mb-2">Select Tier:</div>
              {['tier_1', 'tier_2', 'tier_3'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => { onUpdateTier(referral.user_id, tier); setShowTierSelect(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    referral.tier === tier
                      ? 'bg-primary text-white dark:bg-primary-600'
                      : 'bg-white border border-gray-200 text-dark hover:bg-gray-100'
                  }`}
                >
                  {tier.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Total Referrals" value={referral.total_referrals || 0} />
            <InfoRow label="Active Referrals" value={referral.active_referrals || 0} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Total Earned" value={formatCurrency(referral.total_earned || 0)} />
            <InfoRow label="Pending Earnings" value={formatCurrency(referral.pending_earnings || 0)} />
          </div>

          {referral.fraud_flags && referral.fraud_flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-red-800 mb-2">⚠️ Fraud Flags</div>
              <ul className="text-sm text-red-700 space-y-1">
                {referral.fraud_flags.map((flag, idx) => (
                  <li key={idx}>• {flag}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="text-sm text-gray-400 mb-2">Referral List</div>
            {referral.referees && referral.referees.length > 0 ? (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-48 overflow-auto">
                {referral.referees.map((referee, idx) => (
                  <div key={idx} className="text-sm text-dark flex justify-between">
                    <span>{referee.email || referee.id}</span>
                    <span className="text-gray-400">{new Date(referee.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
                No referrals yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-dark">{value}</div>
    </div>
  );
}

function ReferralsTable({ referrals, onView, onResetFraud }) {
  const columns = useMemo(() => [
    {
      key: 'user',
      label: 'User',
      sortable: true,
      render: (ref) => (
        <div>
          <div className="text-sm font-medium text-dark">{ref.user_email}</div>
          <div className="text-xs text-gray-400">
            Joined: {new Date(ref.created_at).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (ref) => (
        <div className="text-sm font-mono text-dark">{ref.referral_code}</div>
      ),
    },
    {
      key: 'tier',
      label: 'Tier',
      sortable: true,
      render: (ref) => <TierBadge tier={ref.tier} />,
    },
    {
      key: 'referrals',
      label: 'Referrals',
      sortable: true,
      render: (ref) => (
        <div>
          <div className="text-sm font-semibold text-dark">{ref.total_referrals || 0}</div>
          <div className="text-xs text-gray-400">Active: {ref.active_referrals || 0}</div>
        </div>
      ),
    },
    {
      key: 'earnings',
      label: 'Earnings',
      sortable: true,
      render: (ref) => (
        <div>
          <div className="text-sm font-bold text-success">
            {formatCurrency(ref.total_earned || 0)}
          </div>
          <div className="text-xs text-gray-400">
            Pending: {formatCurrency(ref.pending_earnings || 0)}
          </div>
        </div>
      ),
    },
    {
      key: 'fraud',
      label: 'Fraud',
      sortable: true,
      render: (ref) => (
        ref.fraud_flags && ref.fraud_flags.length > 0 ? (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            {ref.fraud_flags.length} flags
          </span>
        ) : (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Clean
          </span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (ref) => (
        <div className="flex gap-2">
          <button
            onClick={() => onView(ref)}
            className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            View
          </button>
          {ref.fraud_flags && ref.fraud_flags.length > 0 && (
            <button
              onClick={() => onResetFraud(ref.user_id)}
              className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      ),
    },
  ], [onView, onResetFraud]);

  return (
    <DataTable
      columns={columns}
      data={referrals}
      itemsPerPage={10}
      emptyMessage="No referrals found"
      searchable={true}
      searchKeys={['user_email', 'referral_code', 'tier']}
      sortable={true}
      mobileCardView={true}
      renderCard={(ref) => (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">User</div>
              <div className="text-sm font-medium text-dark truncate">{ref.user_email}</div>
            </div>
            <TierBadge tier={ref.tier} />
          </div>
          <div className="flex justify-between items-center gap-3 mb-2">
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Code</div>
              <div className="text-sm font-mono text-dark">{ref.referral_code}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Earnings</div>
              <div className="text-sm font-bold text-success">{formatCurrency(ref.total_earned || 0)}</div>
            </div>
          </div>
          <div className="flex justify-between items-center gap-3">
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Referrals</div>
              <div className="text-sm font-semibold text-dark">{ref.total_referrals || 0}</div>
            </div>
            {ref.fraud_flags && ref.fraud_flags.length > 0 ? (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                {ref.fraud_flags.length} flags
              </span>
            ) : (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                Clean
              </span>
            )}
          </div>
          <button
            onClick={() => onView(ref)}
            className="w-full mt-3 px-3 py-2 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            View Details
          </button>
        </div>
      )}
    />
  );
}
