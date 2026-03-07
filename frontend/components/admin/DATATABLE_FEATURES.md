# Enhanced DataTable - Feature Guide

## 🎯 New Features

### 1. **Loading Skeleton** ✅
```jsx
<DataTable
  columns={columns}
  data={data}
  loading={isLoading}
/>
```

### 2. **Search Functionality** ✅
```jsx
<DataTable
  columns={columns}
  data={users}
  searchable={true}
  searchKeys={['email', 'name']} // Search specific fields
  searchPlaceholder="Search users..."
/>
```

### 3. **Sortable Columns** ✅
```jsx
<DataTable
  columns={[
    { key: 'email', label: 'Email', sortable: true },
    { key: 'created_at', label: 'Created', sortable: true },
  ]}
  data={users}
  sortable={true}
  onSort={(key, direction) => handleSort(key, direction)}
/>
```

### 4. **Bulk Actions** ✅
```jsx
<DataTable
  columns={columns}
  data={payments}
  bulkActions={[
    { 
      label: 'Approve Selected', 
      action: handleBulkApprove,
      className: 'bg-green-50 text-success hover:bg-green-100'
    },
    { 
      label: 'Reject Selected', 
      action: handleBulkReject,
      className: 'bg-red-50 text-red-500 hover:bg-red-100'
    },
  ]}
/>
```

### 5. **Mobile Card View** ✅
```jsx
<DataTable
  columns={columns}
  data={devices}
  mobileCardView={true}
  renderCard={(device) => (
    <div className="bg-white border rounded-xl p-4">
      <div className="font-bold">{device.device_name}</div>
      <div className="text-sm text-gray-500">{device.ip_address}</div>
      <StatusBadge status={device.status} />
    </div>
  )}
/>
```

### 6. **Server-Side Pagination** ✅
```jsx
<DataTable
  columns={columns}
  data={payments}
  serverSide={true}
  totalItems={totalFromAPI}
  onPageChange={(page) => fetchPage(page)}
/>
```

### 7. **Smart Pagination** ✅
- Automatically shows limited range for many pages
- Example: `[1] ... [5] [6] [7] ... [20]`

### 8. **Row Click Handler** ✅
```jsx
<DataTable
  columns={columns}
  data={users}
  onRowClick={(user) => openUserDetail(user)}
/>
```

## 📦 Complete Example

```jsx
import { useState, useEffect } from 'react';
import { DataTable, StatusBadge } from '@/components/admin';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user) => (
        <span className="font-medium">{user.email}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
    },
  ];

  const bulkActions = [
    {
      label: 'Enable Selected',
      action: () => handleBulkEnable(selectedRows),
      className: 'bg-green-50 text-success hover:bg-green-100',
    },
    {
      label: 'Disable Selected',
      action: () => handleBulkDisable(selectedRows),
      className: 'bg-red-50 text-red-500 hover:bg-red-100',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      searchable={true}
      searchKeys={['email']}
      sortable={true}
      bulkActions={bulkActions}
      mobileCardView={true}
      itemsPerPage={15}
      emptyMessage="No users found"
    />
  );
}
```

## 🎨 Customization

### Custom Search Input Position
```jsx
<DataTable
  searchable={true}
  searchPlaceholder="Find anything..."
/>
```

### Custom Empty State
```jsx
<DataTable
  emptyIcon="🔍"
  emptyMessage="No results match your search"
/>
```

### Disable Sort on Specific Columns
```jsx
columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }, // No sort
]
```

## 🔧 Hooks Usage

You can also use the hooks directly:

```jsx
import { usePagination, useSearch, useSort } from '@/components/admin';

function MyComponent({ data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Apply search
  const searched = useSearch(data, ['email', 'name'], searchTerm);
  
  // Apply sort
  const sorted = useSort(searched, sortConfig);
  
  // Apply pagination
  const { currentPageData, currentPage, totalPages, goToPage } = usePagination(sorted, 10);

  return (
    // Render your custom UI
  );
}
```

## 📊 Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | Array | Required | Column definitions |
| `data` | Array | `[]` | Data to display |
| `itemsPerPage` | Number | `10` | Items per page |
| `loading` | Boolean | `false` | Show loading skeleton |
| `searchable` | Boolean | `false` | Enable search |
| `searchKeys` | Array | `[]` | Keys to search |
| `sortable` | Boolean | `false` | Enable column sorting |
| `serverSide` | Boolean | `false` | Server-side mode |
| `totalItems` | Number | - | Total from server |
| `bulkActions` | Array | `[]` | Bulk action buttons |
| `mobileCardView` | Boolean | `false` | Mobile cards |
| `renderCard` | Function | - | Custom card renderer |
| `onRowClick` | Function | - | Row click handler |

## 🚀 Performance Tips

1. **Use `serverSide` for large datasets** (>1000 items)
2. **Specify `searchKeys`** for better search performance
3. **Use `useMemo`** for column definitions
4. **Enable `mobileCardView`** for better mobile UX
