# Component Structure & Reusability Guide

## 📁 Component Hierarchy

### Layout Components (Parent)
```
Layout.js (Root Parent)
├── Sidebar
├── Header
│   └── DarkModeToggle
└── Main Content
    └── Page Components (Children)
```

### Page Components (Children)
```
Dashboard.js
├── SubscriptionCard
├── VPNConfiguration
│   ├── DeviceTypeSelector
│   └── DeviceNameInput
├── DevicesList
│   └── DeviceItem
└── DeviceModal (with tabs)
    ├── QRCodeTab
    ├── ConfigTab
    └── GuideTab

Wallet.js
├── BalanceCard
├── Tabs
├── TopupForm (uses PaymentForm)
├── TopupHistory (uses PaymentHistory)
└── TransactionsList

Payment.js
├── Tabs
├── PaymentForm (reusable)
└── PaymentHistory (reusable)

Referral.js
├── ReferralHeader
├── StatsGrid
│   └── StatCard (reusable)
├── TierCards
├── HowItWorks
│   └── Step (reusable)
└── EarningsHistory
    └── EarningItem

Settings.js
├── ProfileSection
└── PreferencesSection

ProfileEdit.js
├── EditForm
└── AvatarUpload

Notifications.js
├── NotificationsList
└── NotificationItem
```

### Admin Components
```
AdminDashboard.js
├── StatsGrid
├── RecentActivity
└── QuickActions

AdminBilling.js
├── StatsCards
├── Tabs
├── PaymentsTable
│   └── PaymentRow
└── PaymentDetailModal
    ├── PaymentInfo
    ├── ProofImage
    └── ActionButtons

AdminCredit.js
├── StatsCards
├── Tabs
├── TransactionsTable
└── TransactionRow

AdminReferral.js
├── StatsCards
├── FraudSuspects
└── ReferralEvents

AdminSettings.js
├── SettingsCategories
└── SettingsForm

PaymentSettings.js
├── BankAccountsForm
├── PlansForm
└── QRCodesSettings
```

## 🔄 Reusable Components

### Already Created
1. **PaymentForm.js** ✅
   - `PaymentForm` (main form)
   - `BankAccountsDisplay` (bank info)
   - `PaymentHistory` (history list)
   - `StatusBadge` (status indicator)

2. **DarkModeToggle.js** ✅
   - Standalone toggle component

3. **RequestBlockingOverlay.js** ✅
   - Loading overlay for requests

4. **Toast.js** ✅
   - Notification system

### Need to Create

1. **UI Components (Atomic)**
   ```
   components/ui/
   ├── Card.js
   ├── Button.js
   ├── Input.js
   ├── Label.js
   ├── Badge.js
   ├── Avatar.js
   ├── Modal.js
   ├── Tabs.js
   └── EmptyState.js
   ```

2. **Common Components**
   ```
   components/common/
   ├── StatCard.js
   ├── LoadingSpinner.js
   ├── ErrorBoundary.js
   ├── PageHeader.js
   ├── SectionHeader.js
   └── DataList.js
   ```

3. **Device Components**
   ```
   components/device/
   ├── DeviceCard.js
   ├── DeviceIcon.js
   ├── DeviceStatus.js
   ├── DeviceQRCode.js
   └── DeviceConfig.js
   ```

## 📋 Component Props Pattern

### Standard Props
```javascript
// Card Component
function Card({ 
  children,      // Content
  className,     // Additional classes
  onClick,       // Click handler
  variant = 'default', // default | outlined | filled
  size = 'medium'      // small | medium | large
}) {}

// Button Component
function Button({
  children,
  onClick,
  variant = 'primary',  // primary | secondary | danger | ghost
  size = 'medium',      // small | medium | large
  disabled = false,
  loading = false,
  icon,                 // Icon component
  className
}) {}

// Input Component
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  disabled = false,
  required = false,
  icon,
  className
}) {}
```

## 🎯 Best Practices

### 1. Component Composition
```jsx
// ❌ Bad: Monolithic component
function Dashboard() {
  return (
    <div>
      <div className="card">...</div>
      <div className="stats">...</div>
      <div className="list">...</div>
    </div>
  );
}

// ✅ Good: Composed components
function Dashboard() {
  return (
    <div className="space-y-6">
      <StatsGrid stats={stats} />
      <DeviceList devices={devices} />
      <DeviceModal device={selectedDevice} />
    </div>
  );
}
```

### 2. Props Drilling Prevention
```jsx
// ❌ Bad: Too many prop levels
<Dashboard token={token} userData={userData}>
  <DeviceList token={token} userData={userData}>
    <DeviceItem token={token} userData={userData}>
      <DeviceModal token={token} userData={userData} />
    </DeviceItem>
  </DeviceList>
</Dashboard>

// ✅ Good: Use Context or Store
<Dashboard>
  <DeviceList>
    <DeviceItem>
      <DeviceModal />
    </DeviceItem>
  </DeviceList>
</Dashboard>
```

### 3. Custom Hooks for Logic
```jsx
// ✅ Good: Separate logic from UI
function useDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDevices();
  }, []);
  
  const addDevice = async (name) => { ... };
  const removeDevice = async (id) => { ... };
  
  return { devices, loading, addDevice, removeDevice };
}

function DeviceList() {
  const { devices, loading, addDevice, removeDevice } = useDevices();
  return <div>...</div>;
}
```

### 4. Render Props Pattern
```jsx
// ✅ Good: Flexible rendering
function StatusBadge({ status, render }) {
  const config = getStatusConfig(status);
  
  if (render) {
    return render(config);
  }
  
  return (
    <span className={`badge ${config.color}`}>
      {status}
    </span>
  );
}

// Usage
<StatusBadge status="active" />
<StatusBadge 
  status="active" 
  render={({ color, icon }) => (
    <div className="custom">
      <Icon>{icon}</Icon>
      <span style={{ color }}>Active</span>
    </div>
  )}
/>
```

### 5. Compound Components
```jsx
// ✅ Good: Flexible compound pattern
function Tabs({ value, onChange, children }) {
  return <div className="tabs">{children}</div>;
}

function TabsList({ children }) {
  return <div className="tabs-list">{children}</div>;
}

function TabsTrigger({ value, children }) {
  return <button>{children}</button>;
}

function TabsContent({ value, children }) {
  return <div className="tabs-content">{children}</div>;
}

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

// Usage
<Tabs value="active" onChange={setValue}>
  <Tabs.List>
    <Tabs.Trigger value="active">Active</Tabs.Trigger>
    <Tabs.Trigger value="pending">Pending</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="active">
    <ActiveTabContent />
  </Tabs.Content>
</Tabs>
```

## 🔧 Refactoring Priority

### High Priority (Do First)
1. ✅ **PaymentForm** - Already done
2. ⏳ **StatCard** - Used in 5+ pages
3. ⏳ **DeviceCard** - Used in Dashboard & Admin
4. ⏳ **Modal** - Used everywhere
5. ⏳ **Tabs** - Used in multiple pages

### Medium Priority
1. ⏳ **Button** - Standardize styles
2. ⏳ **Input** - Consistent validation
3. ⏳ **Card** - Unified design
4. ⏳ **Badge** - Status indicators
5. ⏳ **EmptyState** - Consistent empty states

### Low Priority (Nice to Have)
1. ⏳ **Avatar** - User images
2. ⏳ **LoadingSpinner** - Loading states
3. ⏳ **ErrorBoundary** - Error handling
4. ⏳ **PageHeader** - Page titles
5. ⏳ **DataList** - List rendering

## 📊 Current Reusability Score

| Component | Reusability | Status |
|-----------|-------------|--------|
| PaymentForm | 100% | ✅ Done |
| PaymentHistory | 100% | ✅ Done |
| BankAccountsDisplay | 100% | ✅ Done |
| DarkModeToggle | 100% | ✅ Done |
| StatusBadge | 80% | ⚠️ Partial |
| DeviceModal | 60% | ⚠️ Needs work |
| Dashboard | 40% | ❌ Monolithic |
| AdminBilling | 50% | ⚠️ Partial |
| Referral | 70% | ⚠️ Good |
| Wallet | 80% | ✅ Good |

## 🎯 Next Steps

1. **Extract StatCard** - Create reusable component
2. **Extract Device Components** - DeviceCard, DeviceIcon, etc.
3. **Create UI Library** - Button, Input, Card, etc.
4. **Implement Compound Components** - Tabs, Modal, etc.
5. **Add Custom Hooks** - useDevices, usePayments, etc.
6. **Document Props** - TypeScript-like documentation
7. **Add Storybook** - Visual testing (optional)

## 📝 Component Template

```javascript
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * ComponentName - Brief description
 * 
 * @param {type} prop - Description
 * @returns {JSX} Component JSX
 * 
 * @example
 * <ComponentName prop="value" />
 */
export default function ComponentName({ 
  prop1, 
  prop2 = 'default',
  className = '',
  ...props 
}) {
  // Hooks
  const [state, setState] = useState(initialState);
  
  // Effects
  useEffect(() => {
    // Side effect
  }, [dependencies]);
  
  // Handlers
  const handleClick = () => {
    // Logic
  };
  
  // Render
  return (
    <div className={`base-classes ${className}`} {...props}>
      {/* Content */}
    </div>
  );
}

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.string,
  className: PropTypes.string,
};
```
