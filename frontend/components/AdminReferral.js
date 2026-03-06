import { useEffect, useState } from 'react';
import { useUIStore, apiFetch } from '../store';

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
      const [statsData, referralsData, configData] = await Promise.all([
        apiFetch('/admin/referral/stats').catch(() => ({ stats: null })),
        apiFetch('/admin/referral/list?limit=100'),
        apiFetch('/admin/referral/config').catch(() => ({ config: null })),
      ]);
      setStats(statsData.stats || null);
      setReferrals(referralsData.referrals || []);
      setConfig(configData.config || null);
    } catch (error) {
      showNotification('Failed to load referral data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTier = async (userId, newTier) => {
    try {
      await apiFetch(`/admin/referral/users/${userId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      showNotification('User tier updated');
      fetchData();
    } catch (error) {
      showNotification(error.message || 'Failed to update tier', 'error');
    }
  };

  const handleResetFraud = async (userId) => {
    if (!confirm('Reset fraud flags for this user?')) return;
    try {
      await apiFetch(`/admin/referral/users/${userId}/reset-fraud`, {
        method: 'POST',
      });
      showNotification('Fraud flags reset');
      fetchData();
    } catch (error) {
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Referrals</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Earnings</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fraud</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-4xl mb-2 block">📭</span>
                      No referrals found
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map((ref) => (
                  <tr key={ref.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-dark">{ref.user_email}</div>
                      <div className="text-xs text-gray-400">
                        Joined: {new Date(ref.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-mono text-dark">{ref.referral_code}</div>
                    </td>
                    <td className="py-4 px-4">
                      <TierBadge tier={ref.tier} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold text-dark">{ref.total_referrals || 0}</div>
                      <div className="text-xs text-gray-400">
                        Active: {ref.active_referrals || 0}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-success">
                        {formatCurrency(ref.total_earned || 0)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Pending: {formatCurrency(ref.pending_earnings || 0)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {ref.fraud_flags && ref.fraud_flags.length > 0 ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          {ref.fraud_flags.length} flags
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          Clean
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedReferral(ref)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          View
                        </button>
                        {ref.fraud_flags && ref.fraud_flags.length > 0 && (
                          <button
                            onClick={() => handleResetFraud(ref.user_id)}
                            className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

function StatCard({ label, value, color, bg }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
        <div className={`text-lg font-bold ${color}`}>#</div>
      </div>
      <div className={`text-xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
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
                      ? 'bg-primary text-white'
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}
