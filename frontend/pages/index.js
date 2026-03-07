import { useState, useEffect } from 'react';
import Link from 'next/link';

const translations = {
  en: {
    // Hero Section
    heroBadge: '🔒 Trusted by 1000+ Users',
    heroTitle: 'Secure VPN Access',
    heroSubtitle: 'Fast, Secure, and Reliable VPN Connection',
    heroDescription: 'Protect your online privacy with our enterprise-grade VPN service. Access content from anywhere with military-grade encryption.',
    ctaPrimary: 'Get Started Free',
    ctaSecondary: 'View Plans',
    
    // Features
    featuresEyebrow: 'FEATURES',
    featuresTitle: 'Why Choose Us?',
    featuresSubtitle: 'Premium VPN Features for Modern Internet Users',
    features: [
      {
        icon: '⚡',
        title: 'Lightning Fast',
        description: 'High-speed servers optimized for streaming, gaming, and downloading without lag.'
      },
      {
        icon: '🔒',
        title: 'Military-Grade Security',
        description: 'AES-256 encryption keeps your data safe from hackers and surveillance.'
      },
      {
        icon: '🌍',
        title: 'Global Access',
        description: 'Connect to servers worldwide and access content from any location.'
      },
      {
        icon: '📱',
        title: 'Multi-Device Support',
        description: 'Protect all your devices with one account. Up to 3 devices simultaneously.'
      },
      {
        icon: '🎯',
        title: 'No Logs Policy',
        description: 'We don\'t track or store your browsing activity. Your privacy is guaranteed.'
      },
      {
        icon: '💬',
        title: '24/7 Support',
        description: 'Our support team is always ready to help you with any questions.'
      }
    ],
    
    // Pricing
    pricingEyebrow: 'PRICING',
    pricingTitle: 'Simple, Transparent Pricing',
    pricingSubtitle: 'No hidden fees. Cancel anytime.',
    pricing: [
      {
        name: 'Monthly',
        price: 'Rp 50,000',
        period: 'month',
        features: [
          '3 Devices',
          'Unlimited Bandwidth',
          'All Server Locations',
          '24/7 Support',
          'Money-back Guarantee'
        ],
        popular: false
      },
      {
        name: 'Yearly',
        price: 'Rp 450,000',
        period: 'year',
        originalPrice: 'Rp 600,000',
        saveAmount: 'Rp 150,000',
        features: [
          '5 Devices',
          'Unlimited Bandwidth',
          'All Server Locations',
          '24/7 Support',
          'Money-back Guarantee',
          '2 Months Free'
        ],
        popular: true
      }
    ],
    savePercent: 'Save 25%',
    bestValue: 'Best Value',
    
    // Stats
    stats: [
      { value: '1000+', label: 'Active Users' },
      { value: '50+', label: 'Server Locations' },
      { value: '99.9%', label: 'Uptime' },
      { value: '24/7', label: 'Support' }
    ],
    
    // CTA
    ctaTitle: 'Ready to Get Started?',
    ctaSubtitle: 'Join thousands of satisfied users today',
    ctaButton: 'Create Free Account',
    ctaNote: 'No credit card required',
    
    // Footer
    footerTagline: 'Secure and reliable VPN service for everyone.',
    footerProduct: 'Product',
    footerCompany: 'Company',
    footerSupport: 'Support',
    footerLegal: 'Legal',
    footerFeatures: 'Features',
    footerPricing: 'Pricing',
    footerDownload: 'Download',
    footerAbout: 'About Us',
    footerBlog: 'Blog',
    footerContact: 'Contact',
    footerHelpCenter: 'Help Center',
    footerFAQ: 'FAQ',
    footerStatus: 'Server Status',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerCopyright: '© 2024 VPN Access Manager. All rights reserved.',
    
    // Language
    language: '🇬🇧 EN'
  },
  id: {
    // Hero Section
    heroBadge: '🔒 Dipercaya 1000+ Pengguna',
    heroTitle: 'Akses VPN Aman',
    heroSubtitle: 'Koneksi VPN Cepat, Aman, dan Terpercaya',
    heroDescription: 'Lindungi privasi online Anda dengan layanan VPN kelas enterprise. Akses konten dari mana saja dengan enkripsi tingkat militer.',
    ctaPrimary: 'Mulai Gratis',
    ctaSecondary: 'Lihat Paket',
    
    // Features
    featuresEyebrow: 'FITUR',
    featuresTitle: 'Mengapa Memilih Kami?',
    featuresSubtitle: 'Fitur VPN Premium untuk Pengguna Internet Modern',
    features: [
      {
        icon: '⚡',
        title: 'Super Cepat',
        description: 'Server berkecepatan tinggi yang dioptimalkan untuk streaming, gaming, dan download tanpa lag.'
      },
      {
        icon: '🔒',
        title: 'Keamanan Tingkat Militer',
        description: 'Enkripsi AES-256 menjaga data Anda aman dari hacker dan pengawasan.'
      },
      {
        icon: '🌍',
        title: 'Akses Global',
        description: 'Terhubung ke server di seluruh dunia dan akses konten dari lokasi mana pun.'
      },
      {
        icon: '📱',
        title: 'Dukungan Multi-Device',
        description: 'Lindungi semua perangkat Anda dengan satu akun. Hingga 3 perangkat bersamaan.'
      },
      {
        icon: '🎯',
        title: 'Kebijakan No Logs',
        description: 'Kami tidak melacak atau menyimpan aktivitas browsing Anda. Privasi Anda terjamin.'
      },
      {
        icon: '💬',
        title: 'Support 24/7',
        description: 'Tim support kami selalu siap membantu Anda dengan pertanyaan apa pun.'
      }
    ],
    
    // Pricing
    pricingEyebrow: 'HARGA',
    pricingTitle: 'Harga Sederhana & Transparan',
    pricingSubtitle: 'Tanpa biaya tersembunyi. Batal kapan saja.',
    pricing: [
      {
        name: 'Bulanan',
        price: 'Rp 50,000',
        period: 'bulan',
        features: [
          '3 Perangkat',
          'Bandwidth Unlimited',
          'Semua Lokasi Server',
          'Support 24/7',
          'Jaminan Uang Kembali'
        ],
        popular: false
      },
      {
        name: 'Tahunan',
        price: 'Rp 450,000',
        period: 'tahun',
        originalPrice: 'Rp 600,000',
        saveAmount: 'Rp 150,000',
        features: [
          '5 Perangkat',
          'Bandwidth Unlimited',
          'Semua Lokasi Server',
          'Support 24/7',
          'Jaminan Uang Kembali',
          'Gratis 2 Bulan'
        ],
        popular: true
      }
    ],
    savePercent: 'Hemat 25%',
    bestValue: 'Paling Hemat',
    
    // Stats
    stats: [
      { value: '1000+', label: 'Pengguna Aktif' },
      { value: '50+', label: 'Lokasi Server' },
      { value: '99.9%', label: 'Uptime' },
      { value: '24/7', label: 'Support' }
    ],
    
    // CTA
    ctaTitle: 'Siap untuk Memulai?',
    ctaSubtitle: 'Bergabung dengan ribuan pengguna puas hari ini',
    ctaButton: 'Buat Akun Gratis',
    ctaNote: 'Tanpa kartu kredit',
    
    // Footer
    footerTagline: 'Layanan VPN aman dan terpercaya untuk semua orang.',
    footerProduct: 'Produk',
    footerCompany: 'Perusahaan',
    footerSupport: 'Bantuan',
    footerLegal: 'Legal',
    footerFeatures: 'Fitur',
    footerPricing: 'Harga',
    footerDownload: 'Download',
    footerAbout: 'Tentang Kami',
    footerBlog: 'Blog',
    footerContact: 'Kontak',
    footerHelpCenter: 'Pusat Bantuan',
    footerFAQ: 'FAQ',
    footerStatus: 'Status Server',
    footerPrivacy: 'Kebijakan Privasi',
    footerTerms: 'Syarat Layanan',
    footerCopyright: '© 2024 VPN Access Manager. Hak cipta dilindungi.',
    
    // Language
    language: '🇮🇩 ID'
  }
};

export default function LandingPage() {
  const [lang, setLang] = useState('en');
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const t = translations[lang];
  const toggleLang = () => setLang(lang === 'en' ? 'id' : 'en');

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {/* Gradient Background - Fixed positioning */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">VPN Access</span>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                onClick={toggleLang}
                className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {t.language}
              </button>
              
              {/* Login Link */}
              <Link
                href="/login"
                className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              
              {/* CTA Button */}
              <Link
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                {t.ctaPrimary}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <span className="text-sm font-medium text-gray-300">{t.heroBadge}</span>
            </div>

            {/* Title */}
            <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <span className="bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent">
                {t.heroTitle}
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-xl sm:text-2xl font-medium text-gray-400 mb-6 transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {t.heroSubtitle}
            </p>

            {/* Description */}
            <p className={`text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-10 transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {t.heroDescription}
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transition-all duration-700 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-semibold text-base transition-all transform hover:scale-105 shadow-xl shadow-blue-500/25"
              >
                {t.ctaPrimary}
              </Link>
              <a
                href="#pricing"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-base transition-all backdrop-blur-sm"
              >
                {t.ctaSecondary}
              </a>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-3xl mx-auto transition-all duration-700 delay-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {t.stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-black via-blue-950/5 to-black">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-400 tracking-wider uppercase mb-3">
              {t.featuresEyebrow}
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight">
              {t.featuresTitle}
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t.featuresSubtitle}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="text-4xl mb-5">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-400 tracking-wider uppercase mb-3">
              {t.pricingEyebrow}
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight">
              {t.pricingTitle}
            </h2>
            <p className="text-lg text-gray-400">
              {t.pricingSubtitle}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {t.pricing.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-blue-600/10 to-cyan-600/10 border-blue-500/50'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-xs font-semibold tracking-wide">
                    {t.bestValue}
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-3 text-gray-300">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                  {plan.originalPrice && (
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <span className="text-gray-600 line-through">{plan.originalPrice}</span>
                      <span className="text-green-400 font-medium">{t.savePercent} ({plan.saveAmount})</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`block w-full py-4 rounded-xl font-semibold text-center transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {t.ctaPrimary}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-3xl overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
            
            <div className="relative text-center">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight">
                {t.ctaTitle}
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                {t.ctaSubtitle}
              </p>
              <Link
                href="/login"
                className="inline-block px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl shadow-blue-500/25"
              >
                {t.ctaButton}
              </Link>
              <p className="text-sm text-gray-500 mt-4">
                {t.ctaNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-xl font-bold">VPN Access</span>
              </div>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {t.footerTagline}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase text-gray-300">{t.footerProduct}</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">{t.footerFeatures}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t.footerPricing}</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">{t.footerDownload}</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase text-gray-300">{t.footerCompany}</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerAbout}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerBlog}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerContact}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase text-gray-300">{t.footerSupport}</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerHelpCenter}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerFAQ}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerStatus}</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase text-gray-300">{t.footerLegal}</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerPrivacy}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerTerms}</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-white/10 text-center text-sm text-gray-600">
            {t.footerCopyright}
          </div>
        </div>
      </footer>
    </div>
  );
}
