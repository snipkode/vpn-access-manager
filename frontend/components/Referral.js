import { useEffect, useState } from 'react';
import { useAuthStore, useUIStore, apiFetch } from '../store';

export default function Referral({ token }) {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [tier, setTier] = useState({ name: 'Bronze', multiplier: 1 });
  const [stats, setStats] = useState({
    total_referrals: 0,
    active_referrals: 0,
    total_earned: 0,
    pending_earnings: 0,
  });
  const [earnings, setEarnings] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [codeData, statsData, earningsData, configData] = await Promise.all([
        apiFetch('/referral/code'),
        apiFetch('/referral/stats'),
        apiFetch('/referral/earnings?limit=20'),
        apiFetch('/referral/config'),
      ]);

      setReferralCode(codeData.referral_code || '');
      setReferralLink(codeData.referral_link || '');
      setTier(codeData.tier || { name: 'Bronze', multiplier: 1 });
      setStats(statsData.referral || stats);
      setEarnings(earningsData.earnings || []);
      setConfig(configData.config || null);
    } catch (error) {
      showNotification('Failed to load referral data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      showNotification('Referral link copied!');
    } catch (error) {
      showNotification('Failed to copy link', 'error');
    }
  };

  const shareReferral = async () => {
    const shareData = {
      title: 'Join VPN Access Manager',
      text: `Join VPN Access Manager using my referral code: ${referralCode}`,
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showNotification('Thanks for sharing!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          showNotification('Failed to share', 'error');
        }
      }
    } else {
      copyLink();
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
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 shadow-lg shadow-purple-500/30">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Refer & Earn</h1>
            <p className="text-white/80 text-sm">Invite friends and earn credit rewards</p>
          </div>
          <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
            <span className="text-white font-semibold text-sm">{tier.name} Tier</span>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <div className="text-sm text-white/70 mb-2">Your Referral Code</div>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-3 bg-white/20 rounded-xl text-white font-mono text-lg text-center font-bold tracking-wider">
              {referralCode || '---'}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-white/90 transition-colors"
            >
              <i className="fas fa-copy" />
            </button>
            <button
              onClick={shareReferral}
              className="px-4 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              <i className="fas fa-share" />
            </button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-sm text-white/70 mb-2">Referral Link</div>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2.5 bg-white/20 rounded-xl text-white/90 text-xs font-mono truncate">
              {referralLink || '---'}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 bg-white text-purple-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Referrals"
          value={stats.total_referrals || 0}
          icon="👥"
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard
          label="Active Referrals"
          value={stats.active_referrals || 0}
          icon="✅"
          color="text-success"
          bg="bg-green-50"
        />
        <StatCard
          label="Total Earned"
          value={formatCurrency(stats.total_earned || 0)}
          icon="💰"
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          label="Pending Earnings"
          value={formatCurrency(stats.pending_earnings || 0)}
          icon="⏳"
          color="text-amber-500"
          bg="bg-amber-50"
        />
      </div>

      {/* Tier Info */}
      {config && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-dark mb-4">Referral Tiers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(config.tiers || {}).map(([tierId, tierInfo]) => (
              <div
                key={tierId}
                className={`p-4 rounded-xl border-2 ${
                  tier.name === tierId
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-lg font-bold text-dark mb-1">{tierInfo.name}</div>
                <div className="text-sm text-gray-500 mb-2">
                  {tierInfo.min_referrals}+ referrals
                </div>
                <div className="text-xs text-primary font-semibold">
                  {tierInfo.multiplier}x rewards
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-dark mb-4">How It Works</h2>
        <div className="space-y-4">
          <Step
            number={1}
            title="Share Your Link"
            description="Send your referral link to friends or share on social media"
            icon="📤"
          />
          <Step
            number={2}
            title="Friend Signs Up"
            description="Your friend registers using your referral code"
            icon="👤"
          />
          <Step
            number={3}
            title="Earn Rewards"
            description={`Get ${config?.referrer_reward ? formatCurrency(config.referrer_reward) : 'Rp 10.000'} for each successful referral`}
            icon="🎁"
          />
        </div>
      </div>

      {/* Earnings History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-dark mb-4">Earnings History</h2>

        {earnings.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-10 text-center">
            <span className="text-5xl mb-4 block opacity-50">🎉</span>
            <div className="text-base font-medium text-dark mb-1">No earnings yet</div>
            <div className="text-sm text-gray-400">Start referring to earn rewards!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {earnings.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-xl flex-shrink-0">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark">
                    Referral: {earning.referee_email || 'Anonymous'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(earning.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-success">
                    +{formatCurrency(earning.credit_earned || 0)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {earning.status || 'completed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-xl font-bold ${color} mb-1`}>{typeof value === 'number' && value > 1000 ? formatCurrency(value) : value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}

function Step({ number, title, description, icon }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-dark mb-1">
          <span className="text-primary mr-2">#{number}</span>
          {title}
        </div>
        <div className="text-sm text-gray-400 leading-relaxed">{description}</div>
      </div>
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
