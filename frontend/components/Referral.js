import { useEffect, useState } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { referralAPI, formatCurrency } from '../lib/api';

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
      const [codeData, statsData, earningsData] = await Promise.all([
        referralAPI.getCode(),
        referralAPI.getStats(),
        referralAPI.getEarnings(),
      ]);

      setReferralCode(codeData.referral_code || '');
      setReferralLink(codeData.referral_link || '');
      setTier(codeData.tier || { name: 'Bronze', multiplier: 1 });
      setStats(statsData.referral || stats);
      setEarnings(earningsData.earnings || []);
      setConfig(codeData.config || null);
    } catch (error) {
      showNotification('Gagal memuat data referral', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      showNotification('✅ Link referral disalin!');
    } catch (error) {
      showNotification('Gagal menyalin link', 'error');
    }
  };

  const shareReferral = async () => {
    const shareData = {
      title: 'Join VPN Access Manager',
      text: `Join VPN Access Manager menggunakan kode referral saya: ${referralCode}`,
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showNotification('Terima kasih telah berbagi!');
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
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-[#5856D6] to-[#007AFF] rounded-3xl p-6 shadow-xl shadow-[#5856D6]/30">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Undang & Dapatkan</h1>
            <p className="text-white/80 text-[13px] font-medium">Undang teman dan dapatkan reward credit</p>
          </div>
          <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
            <span className="text-white font-bold text-[11px] uppercase tracking-wider">{tier.name} Tier</span>
          </div>
        </div>

        {/* Referral Code Display */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-white/20">
          <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-3">
            Kode Referral Anda
          </div>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-[14px] bg-white/20 rounded-2xl text-white font-mono text-[17px] text-center font-bold tracking-wider">
              {referralCode || '---'}
            </div>
            <button
              onClick={copyLink}
              className="px-5 py-[14px] bg-white text-[#5856D6] rounded-2xl font-semibold text-[15px] hover:bg-white/90 transition-all active:scale-[0.95]"
            >
              <i className="fas fa-copy" />
            </button>
            <button
              onClick={shareReferral}
              className="px-5 py-[14px] bg-white/20 text-white rounded-2xl font-semibold text-[15px] hover:bg-white/30 transition-all active:scale-[0.95]"
            >
              <i className="fas fa-share" />
            </button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-3">
            Link Referral
          </div>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-[11px] bg-white/20 rounded-xl text-white/90 text-[11px] font-mono truncate">
              {referralLink || '---'}
            </div>
            <button
              onClick={copyLink}
              className="px-5 py-[11px] bg-white text-[#5856D6] rounded-xl font-semibold text-[13px] hover:bg-white/90 transition-all active:scale-[0.95] whitespace-nowrap"
            >
              Salin Link
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid - iPhone Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Referral"
          value={stats.total_referrals || 0}
          icon="👥"
          color="text-[#007AFF]"
          bg="bg-[#007AFF]/10"
        />
        <StatCard
          label="Aktif"
          value={stats.active_referrals || 0}
          icon="✅"
          color="text-[#34C759]"
          bg="bg-[#34C759]/10"
        />
        <StatCard
          label="Total Dapatan"
          value={formatCurrency(stats.total_earned || 0)}
          icon="💰"
          color="text-[#5856D6]"
          bg="bg-[#5856D6]/10"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(stats.pending_earnings || 0)}
          icon="⏳"
          color="text-[#FF9500]"
          bg="bg-[#FF9500]/10"
        />
      </div>

      {/* Tier Cards */}
      {config && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Tier Referral
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(config.tiers || {}).map(([tierId, tierInfo]) => (
              <div
                key={tierId}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  tier.name === tierId
                    ? 'border-[#007AFF] bg-[#007AFF]/5 shadow-lg shadow-[#007AFF]/10'
                    : 'border-gray-200 bg-[#F2F2F7]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    tierId === 'bronze' ? 'bg-[#CD7F32]' :
                    tierId === 'silver' ? 'bg-[#C0C0C0]' :
                    'bg-[#FFD700]'
                  }`} />
                  <div className="text-[17px] font-bold text-dark tracking-tight">{tierInfo.name}</div>
                </div>
                <div className="text-[13px] text-gray-500 font-medium mb-2">
                  {tierInfo.min_referrals}+ referral
                </div>
                <div className="text-[15px] font-bold text-[#007AFF]">
                  {tierInfo.multiplier}x rewards
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works - iPhone Steps */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-5">
          Cara Kerja
        </h2>
        <div className="space-y-4">
          <Step
            number={1}
            title="Bagikan Link"
            description="Kirim link referral ke teman atau media sosial"
            icon="📤"
            color="#007AFF"
          />
          <Step
            number={2}
            title="Teman Daftar"
            description="Teman Anda mendaftar menggunakan kode referral"
            icon="👤"
            color="#34C759"
          />
          <Step
            number={3}
            title="Dapatkan Reward"
            description={`Dapatkan ${config?.referrer_reward ? formatCurrency(config.referrer_reward) : 'Rp 10.000'} untuk setiap referral sukses`}
            icon="🎁"
            color="#5856D6"
          />
        </div>
      </div>

      {/* Earnings History */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-5">
          Riwayat Pendapatan
        </h2>

        {earnings.length === 0 ? (
          <div className="bg-[#F2F2F7] rounded-2xl p-12 text-center">
            <span className="text-6xl mb-4 block">🎉</span>
            <div className="text-[17px] font-semibold text-dark mb-1 tracking-tight">Belum ada pendapatan</div>
            <div className="text-[13px] text-gray-400 font-medium">Mulai undang untuk dapatkan reward!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {earnings.map((earning) => (
              <div
                key={earning.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-[#007AFF]/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#34C759]/10 flex items-center justify-center text-2xl flex-shrink-0">
                    🎁
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-dark tracking-tight truncate">
                      Referral: {earning.referee_email || 'Anonymous'}
                    </div>
                    <div className="text-[13px] text-gray-400 font-medium mt-0.5">
                      {new Date(earning.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[17px] font-bold text-[#34C759] tracking-tight">
                      +{formatCurrency(earning.credit_earned || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
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

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className={`${bg} w-11 h-11 rounded-2xl flex items-center justify-center mb-3`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color} mb-1 tracking-tight`}>
        {typeof value === 'number' && value > 1000 ? formatCurrency(value) : value}
      </div>
      <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Step({ number, title, description, icon, color }) {
  return (
    <div className="flex gap-4">
      <div className="relative flex-shrink-0">
        <div 
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        {number < 3 && (
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-8 -mb-2"
            style={{ backgroundColor: `${color}30` }}
          />
        )}
      </div>
      <div className="flex-1 pt-1">
        <div className="text-[15px] font-bold text-dark mb-1 tracking-tight">
          <span className="mr-2 font-mono text-[13px]" style={{ color }}>#{number}</span>
          {title}
        </div>
        <div className="text-[13px] text-gray-500 font-medium leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
