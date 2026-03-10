import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore, useUIStore } from '../store';
import { referralAPI, formatCurrency } from '../lib/api';

export default function Referral({ token }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [referralData, setReferralData] = useState({
    code: '',
    link: '',
    tier: { name: 'Bronze', multiplier: 1 },
  });
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
      const [codeData, statsData, earningsData] = await Promise.all([
        referralAPI.getCode(),
        referralAPI.getStats(),
        referralAPI.getEarnings(),
      ]);

      setReferralData({
        code: codeData.referral_code || '',
        link: codeData.referral_link || '',
        tier: codeData.tier || { name: 'Bronze', multiplier: 1 },
      });
      setStats(statsData.referral || stats);
      setEarnings(earningsData.earnings || []);
      setConfig(codeData.config || null);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      showNotification('Gagal memuat data referral', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(referralData.code);
      showNotification('✅ Kode referral disalin!');
      setTimeout(() => setCopying(false), 500);
    } catch (error) {
      showNotification('Gagal menyalin kode', 'error');
      setCopying(false);
    }
  };

  const copyLink = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(referralData.link);
      showNotification('✅ Link referral disalin!');
      setTimeout(() => setCopying(false), 500);
    } catch (error) {
      showNotification('Gagal menyalin link', 'error');
      setCopying(false);
    }
  };

  const shareReferral = async () => {
    const shareData = {
      title: '🎁 Bergabung dengan VPN Access',
      text: `Dapatkan VPN premium dengan kode referral saya: ${referralData.code}`,
      url: referralData.link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showNotification('Terima kasih telah berbagi! 🎉');
      } catch (error) {
        if (error.name !== 'AbortError') {
          showNotification('Gagal berbagi', 'error');
        }
      }
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Hero Section - Enhanced with gradient and better hierarchy */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          {/* Header - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5 sm:mb-6">
            <div className="space-y-2 flex-1">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="material-icons-round text-white text-sm sm:text-base">card_giftcard</span>
                <span className="text-white/90 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Referral Program</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                Undang Teman, <br className="hidden sm:block" />
                Dapatkan Reward
              </h1>
              <p className="text-white/80 text-xs sm:text-sm font-medium max-w-md">
                Dapatkan credit cash untuk setiap teman yang bergabung
              </p>
            </div>

            {/* Tier Badge - Mobile Responsive */}
            <div className={`self-start sm:self-auto px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm border border-white/30 ${
              referralData.tier.name === 'Bronze' ? 'bg-orange-500/30' :
              referralData.tier.name === 'Silver' ? 'bg-gray-400/30' :
              referralData.tier.name === 'Gold' ? 'bg-yellow-500/30' :
              'bg-purple-500/30'
            }`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  referralData.tier.name === 'Bronze' ? 'bg-orange-400' :
                  referralData.tier.name === 'Silver' ? 'bg-gray-300' :
                  referralData.tier.name === 'Gold' ? 'bg-yellow-400' :
                  'bg-purple-400'
                } animate-pulse`} />
                <span className="text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap">
                  {referralData.tier.name}
                </span>
              </div>
            </div>
          </div>

          {/* Referral Code Card - Mobile Responsive */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-icons-round text-white text-xl sm:text-2xl">confirmation_number</span>
              </div>
              <span className="text-white/90 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Kode Referral Anda</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 min-w-0 px-4 sm:px-6 py-3 sm:py-4 bg-white/20 backdrop-blur-sm rounded-2xl text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-wider font-mono truncate">
                  {referralData.code || '---'}
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={copyCode}
                  disabled={copying || !referralData.code}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 lg:px-6 py-3 sm:py-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 ${
                    copying
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-blue-600 hover:bg-white/90 active:scale-95'
                  }`}
                >
                  {copying ? (
                    <>
                      <span className="material-icons-round text-xl sm:text-2xl">check</span>
                      <span className="text-xs sm:text-sm font-bold">Disalin!</span>
                    </>
                  ) : (
                    <>
                      <span className="material-icons-round text-xl sm:text-2xl">content_copy</span>
                      <span className="text-xs sm:text-sm font-bold">Salin</span>
                    </>
                  )}
                </button>
                <button
                  onClick={shareReferral}
                  className="w-12 h-12 sm:w-auto sm:px-5 lg:px-6 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-semibold hover:bg-white/30 transition-all active:scale-95 flex items-center justify-center"
                >
                  <span className="material-icons-round text-xl sm:text-2xl">share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Referral Link - Mobile Responsive */}
          <div className="mt-3 sm:mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-icons-round text-white text-lg sm:text-xl">link</span>
              </div>
              <span className="text-white/90 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Link Referral</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm rounded-xl text-white/90 text-[10px] sm:text-xs font-mono truncate">
                {referralData.link || '---'}
              </div>
              <button
                onClick={copyLink}
                disabled={copying}
                className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  copying
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-blue-600 hover:bg-white/90 active:scale-95'
                }`}
              >
                {copying ? (
                  <span className="flex items-center gap-1.5">
                    <span className="material-icons-round text-base">check</span>
                    Disalin!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="material-icons-round text-base">content_copy</span>
                    Salin Link
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Enhanced with better visual hierarchy */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Referral"
          value={stats.total_referrals || 0}
          icon="groups"
          color="from-blue-500 to-blue-600"
          trend={null}
        />
        <StatCard
          label="Aktif"
          value={stats.active_referrals || 0}
          icon="check_circle"
          color="from-green-500 to-green-600"
          trend={null}
        />
        <StatCard
          label="Total Dapatan"
          value={formatCurrency(stats.total_earned || 0)}
          icon="account_balance_wallet"
          color="from-purple-500 to-purple-600"
          trend="+12%"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(stats.pending_earnings || 0)}
          icon="schedule"
          color="from-orange-500 to-orange-600"
          trend={null}
        />
      </div>

      {/* Tier Progress - New Visual Enhancement */}
      {config && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Progress Tier Berikutnya
            </h2>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {referralData.tier.name} → {getNextTier(referralData.tier.name)}
            </span>
          </div>

          <div className="space-y-4">
            {/* Current Tier Progress Bar */}
            <div className="relative">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700">{referralData.tier.name} Tier</span>
                <span className="font-medium text-gray-500">
                  {stats.total_referrals} / {getNextTierRequirement(referralData.tier.name)} referrals
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (stats.total_referrals / getNextTierRequirement(referralData.tier.name)) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Next Tier Preview */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    getNextTier(referralData.tier.name) === 'Silver' ? 'bg-gray-400/20' :
                    getNextTier(referralData.tier.name) === 'Gold' ? 'bg-yellow-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <span className="material-icons-round text-2xl text-gray-600">
                      {getNextTier(referralData.tier.name) === 'Silver' ? 'emoji_events' :
                       getNextTier(referralData.tier.name) === 'Gold' ? 'emoji_events' :
                       'workspace_premium'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-700">{getNextTier(referralData.tier.name)} Tier</div>
                    <div className="text-xs text-gray-500 font-medium">
                      {getTierMultiplier(getNextTier(referralData.tier.name))}x rewards
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Butuh</div>
                  <div className="text-sm font-bold text-blue-600">
                    {Math.max(0, getNextTierRequirement(referralData.tier.name) - stats.total_referrals)} referral lagi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Cards - Redesigned */}
      {config && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">
            Level Tier System
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(config.tiers || {}).map(([tierId, tierInfo]) => (
              <div
                key={tierId}
                className={`relative overflow-hidden rounded-2xl p-5 border-2 transition-all duration-300 hover:shadow-lg ${
                  referralData.tier.name === tierId
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {referralData.tier.name === tierId && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="material-icons-round text-white text-sm">check</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tierId === 'bronze' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    tierId === 'silver' ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                    tierId === 'gold' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    'bg-gradient-to-br from-purple-400 to-purple-600'
                  }`}>
                    <span className="material-icons-round text-white text-xl font-bold">
                      {tierId === 'bronze' ? 'emoji_events' :
                       tierId === 'silver' ? 'emoji_events' :
                       tierId === 'gold' ? 'emoji_events' : 'workspace_premium'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-800">{tierInfo.name}</div>
                    <div className="text-xs text-gray-500 font-medium">{tierInfo.min_referrals}+ referrals</div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {tierInfo.multiplier}x
                    </div>
                    <div className="text-xs text-gray-600 font-semibold mt-1">rewards multiplier</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works - Enhanced Steps */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">
          Cara Kerja Program Referral
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard
            number={1}
            icon="send"
            color="from-blue-500 to-blue-600"
            title="Bagikan Link"
            description="Salin dan bagikan link referral ke teman atau media sosial Anda"
          />
          <StepCard
            number={2}
            icon="person_add"
            color="from-green-500 to-green-600"
            title="Teman Daftar"
            description="Teman Anda mendaftar dan aktivasi subscription menggunakan kode referral"
          />
          <StepCard
            number={3}
            icon="card_giftcard"
            color="from-purple-500 to-purple-600"
            title="Dapatkan Reward"
            description={`Dapatkan ${config?.referrer_reward ? formatCurrency(config.referrer_reward) : 'Rp 10.000'} credit untuk setiap referral yang sukses`}
          />
        </div>
      </div>

      {/* Earnings History - Enhanced Design */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Riwayat Pendapatan
          </h2>
          {earnings.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {earnings.length} transaksi
            </span>
          )}
        </div>

        {earnings.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="material-icons-round text-4xl text-gray-400">celebration</span>
            </div>
            <div className="text-lg font-bold text-gray-800 mb-2">Belum ada pendapatan</div>
            <div className="text-sm text-gray-500 font-medium mb-4">Mulai undang teman untuk dapatkan reward!</div>
            <button
              onClick={shareReferral}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <span className="material-icons-round text-lg">share</span>
              <span>Undang Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {earnings.map((earning, index) => (
              <div
                key={earning.id}
                className="group bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-md transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-all">
                    <span className="material-icons-round text-white text-2xl">card_giftcard</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 tracking-tight truncate">
                      Referral: {earning.referee_email || 'Anonymous'}
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-1">
                      {new Date(earning.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 tracking-tight">
                      +{formatCurrency(earning.credit_earned || 0)}
                    </div>
                    <div className={`text-xs font-semibold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block ${
                      earning.status === 'completed' ? 'bg-green-100 text-green-700' :
                      earning.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {earning.status || 'completed'}
                    </div>
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

// Enhanced StatCard Component
function StatCard({ label, value, icon, color, trend }) {
  return (
    <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
          <span className="material-icons-round text-white text-2xl">{icon}</span>
        </div>
        {trend && (
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-1 tracking-tight">
        {typeof value === 'number' && value > 1000 ? formatCurrency(value) : value}
      </div>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Enhanced StepCard Component
function StepCard({ number, icon, color, title, description }) {
  return (
    <div className="relative group">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
        {/* Number Badge */}
        <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xs font-bold">#{number}</span>
        </div>

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
          <span className="material-icons-round text-white text-3xl">{icon}</span>
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-gray-800 mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">{description}</p>
      </div>

      {/* Connector Line (except last) */}
      {number < 3 && (
        <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-200 to-gray-300" />
      )}
    </div>
  );
}

// Helper Functions
function getNextTier(currentTier) {
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : 'Platinum';
}

function getNextTierRequirement(currentTier) {
  const requirements = {
    'Bronze': 5,
    'Silver': 10,
    'Gold': 20,
    'Platinum': 50,
  };
  return requirements[currentTier] || 50;
}

function getTierMultiplier(tier) {
  const multipliers = {
    'Bronze': 1,
    'Silver': 1.5,
    'Gold': 2,
    'Platinum': 3,
  };
  return multipliers[tier] || 1;
}
