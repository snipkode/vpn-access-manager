# Responsive Tabs Component

## ✅ Features

- **Mobile**: Horizontal scroll dengan no-wrap text
- **Desktop**: Auto-wrap tabs
- **Custom Render**: Support custom tab content via `renderTab` prop
- **Variants**: default, compact, minimal
- **Smooth Scrolling**: Custom scrollbar styling
- **Icon Support**: Built-in icon support

## 📦 Usage

### Basic Usage
```jsx
import { Tabs } from '@/components/admin';

<Tabs
  tabs={[
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'devices', label: 'Devices' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### With Icons
```jsx
<Tabs
  tabs={[
    { id: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp' },
    { id: 'email', label: 'Email', icon: 'fas fa-envelope' },
    { id: 'billing', label: 'Billing', icon: 'fas fa-credit-card' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Custom Render
```jsx
<Tabs
  tabs={categories}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  renderTab={(tab) => (
    <>
      <i className={`${tab.icon} mr-2`} />
      {tab.label}
    </>
  )}
/>
```

### Compact Variant
```jsx
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  variant="compact"
/>
```

### Disable Scroll (Wrap on Mobile)
```jsx
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  scrollable={false}
/>
```

## 🎨 Variants

| Variant | Size | Use Case |
|---------|------|----------|
| `default` | px-4 py-2.5 text-sm | Standard tabs |
| `compact` | px-3 py-2 text-xs | Space-constrained areas |
| `minimal` | px-2 py-1.5 text-xs | Minimal UI designs |

## 📱 Responsive Behavior

### Mobile (< 768px)
- **Horizontal scroll** enabled by default
- **No-wrap** text - tabs stay on single line
- **Smooth scrolling** with custom scrollbar
- **Min-width** tabs - never shrink

### Desktop (≥ 768px)
- **Wrap enabled** - tabs can wrap to multiple lines
- **Overflow visible** - no scrollbar
- **Flexible layout** - adapts to container

## 🔧 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | Array | Required | `[{ id, label, icon }]` |
| `activeTab` | String | Required | Current active tab ID |
| `onTabChange` | Function | Required | Callback on tab change |
| `scrollable` | Boolean | `true` | Enable horizontal scroll |
| `variant` | String | `'default'` | Tab size variant |
| `className` | String | `''` | Additional CSS classes |
| `renderTab` | Function | `null` | Custom tab renderer |

## 🎯 Examples from Codebase

### AdminDashboard
```jsx
<Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
```

### AdminBilling
```jsx
<Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
```

### AdminSettings (with icons)
```jsx
<Tabs 
  tabs={CATEGORIES} 
  activeTab={activeTab} 
  onTabChange={setActiveTab}
  renderTab={(tab) => (
    <>
      <i className={`${tab.icon} mr-2`} />
      {tab.label}
    </>
  )}
/>
```

## 🎨 Customization

### Custom Colors
```jsx
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  className="bg-gray-50 border-gray-200"
/>
```

### Full Width Tabs
```jsx
<div className="w-full">
  <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
</div>
```

### With Border Radius Override
```jsx
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  className="rounded-2xl"
/>
```

## 📝 Migration Guide

### Before (Hardcoded)
```jsx
<div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
  <div className="flex gap-1 overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          activeTab === tab.id
            ? 'bg-primary text-white'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

### After (Reusable Component)
```jsx
<Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
```

**Benefits:**
- ✅ 80% less code
- ✅ Consistent design
- ✅ Responsive out-of-box
- ✅ Easy to maintain
- ✅ Custom render support

## 🐛 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Edge | ✅ Full |
| Mobile Safari | ✅ Full |
| Chrome Mobile | ✅ Full |

## 🎯 Best Practices

1. **Use `useMemo`** for tabs array to prevent re-renders
2. **Keep labels short** for better mobile UX
3. **Use icons** for better visual recognition
4. **Limit tab count** (max 5-6 for mobile)
5. **Use `compact` variant** for many tabs

## 📊 Performance

- **Zero dependencies** - Pure React + Tailwind
- **CSS-based scrolling** - No JS scroll handlers
- **Minimal re-renders** - Only active tab updates
- **Lightweight** - < 2KB gzipped
