# API Port Update - 3000 to 5000

## Summary

Updated all frontend API references from port `3000` to port `5000` to match backend server configuration.

## Files Updated

### 1. **Core API Files**
- ✅ `lib/api.js` - Main API client
  - Updated `API_URL` default from `http://localhost:3000/api` to `http://localhost:5000/api`
  - Updated Swagger docs reference to `http://localhost:5000/api-docs/`

- ✅ `store/index.js` - Store API helper
  - Updated `API_URL` default to port 5000

### 2. **Configuration Files**
- ✅ `next.config.js` - Next.js rewrites configuration
  - Updated API rewrite destination to `http://localhost:5000/api/:path*`

- ✅ `.env.local.example` - Environment template
  - Updated `NEXT_PUBLIC_API_URL` to `http://localhost:5000/api`

### 3. **Components**
- ✅ `components/AdminBilling.js`
  - Updated hardcoded API URL for payment proof images

## Configuration Summary

All API calls now point to: **`http://localhost:5000/api`**

### Environment Variable
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### API Rewrites
Next.js will proxy `/api/*` requests to `http://localhost:5000/api/*`

## Testing Checklist

- [ ] Frontend can connect to backend API
- [ ] Login/Authentication works
- [ ] VPN device generation works
- [ ] Payment submission works
- [ ] Admin dashboard loads data
- [ ] All API endpoints respond correctly

## Related Documentation

- API Documentation: http://localhost:5000/api-docs/
- Backend Server: http://localhost:5000
- Frontend: http://localhost:3000 (Next.js dev server)

## Notes

- Backend API runs on port **5000**
- Frontend Next.js dev server runs on port **3000**
- API requests are proxied through Next.js rewrites
