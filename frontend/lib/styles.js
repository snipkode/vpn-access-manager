// Shared styles and theme constants
export const theme = {
  colors: {
    bg: {
      primary: '#000000',
      secondary: '#1D1D1F',
      tertiary: '#2D2D2F',
      card: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8E8E93',
      tertiary: '#646466',
    },
    accent: {
      blue: '#007AFF',
      purple: '#BF5AF2',
      green: '#34C759',
      red: '#FF3B30',
      orange: '#FF9500',
      yellow: '#FFCC00',
    },
    border: 'rgba(255, 255, 255, 0.1)',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    s: 6,
    m: 10,
    l: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },
  shadows: {
    sm: '0 4px 14px rgba(0, 0, 0, 0.25)',
    md: '0 8px 32px rgba(0, 0, 0, 0.4)',
    lg: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
};

// Common style functions
export const createStyles = (overrides = {}) => ({
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: theme.colors.bg.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  card: {
    backgroundColor: theme.colors.bg.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    border: `1px solid ${theme.colors.border}`,
  },
  button: {
    padding: `${theme.spacing.m} ${theme.spacing.l}`,
    borderRadius: theme.radius.m,
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  ...overrides,
});

// CSS-in-JS for global styles
export const globalStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: ${theme.colors.bg.primary};
  }
  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.bg.tertiary};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
`;

// Utility functions
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
