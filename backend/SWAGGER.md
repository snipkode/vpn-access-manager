# Swagger API Documentation

## 📖 Accessing the Documentation

Once the server is running, you can access the Swagger UI at:

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

## 🚀 Quick Start

1. Start the server:
   ```bash
   node server.js
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/api-docs
   ```

3. Use the interactive UI to:
   - Browse all available endpoints
   - Test API calls directly from the browser
   - View request/response schemas
   - Authenticate with JWT tokens

## 🔐 Authentication

Most endpoints require authentication using Firebase ID tokens. In Swagger UI:

1. Click the **Authorize** button (lock icon)
2. Enter your Bearer token: `eyJhbGc...`
3. Click **Authorize**

## 📁 File Structure

```
backend/
├── config/
│   ├── swagger.js           # Swagger configuration
│   └── swagger-routes.js    # Additional route annotations
├── routes/
│   ├── auth.js              # Auth endpoints (annotated)
│   ├── vpn.js               # VPN endpoints (annotated)
│   ├── billing.js           # Billing endpoints (annotated)
│   ├── admin.js             # Admin endpoints (annotated)
│   └── ...                  # Other routes
└── server.js                # Main server (with Swagger setup)
```

## 📝 Adding New Endpoints

To document new endpoints, add JSDoc comments above your route handlers:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Description of endpoint
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success response
 *       401:
 *         description: Unauthorized
 */
router.get('/your-endpoint', verifyAuth, async (req, res) => {
  // Your code
});
```

## 🏷️ Available Tags

- **Health** - Health check and API info
- **Auth** - Authentication endpoints
- **VPN** - VPN configuration management
- **User** - User profile and preferences
- **Billing** - Payment and subscription
- **Credit** - Credit balance and transfers
- **Referral** - Referral program
- **Admin** - Admin user management
- **Admin Billing** - Admin payment management
- **Admin Credit** - Admin credit and fraud detection
- **Admin Settings** - System configuration
- **Admin Backup** - Backup and restore

## 📊 API Endpoints Summary

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api` | API info |
| POST | `/api/auth/verify` | Verify Firebase token |
| GET | `/api/billing/plans` | Get pricing plans |
| GET | `/api/payment-settings/*` | Payment configuration |

### User Endpoints (Requires Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/vpn/generate` | Generate VPN config |
| GET | `/api/vpn/devices` | List devices |
| DELETE | `/api/vpn/device/:id` | Revoke device |
| GET | `/api/user/profile` | Get profile |
| PATCH | `/api/user/profile` | Update profile |
| POST | `/api/billing/submit` | Submit payment |
| GET | `/api/billing/history` | Payment history |
| GET | `/api/credit/balance` | Credit balance |
| POST | `/api/credit/transfer` | Transfer credit |
| GET | `/api/referral/code` | Get referral code |

### Admin Endpoints (Requires Admin Role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Update user |
| GET | `/api/admin/stats` | VPN statistics |
| GET | `/api/admin/billing/payments` | List payments |
| POST | `/api/admin/billing/payments/:id/approve` | Approve payment |
| POST | `/api/admin/billing/payments/:id/reject` | Reject payment |
| GET | `/api/admin/credit/transactions` | Credit transactions |
| GET | `/api/admin/credit/fraud-alerts` | Fraud alerts |
| GET/PATCH | `/api/admin/settings/:category` | System settings |
| GET/POST | `/api/admin/backup` | Backup management |

## 🔧 Configuration

Edit `config/swagger.js` to customize:
- API info (title, version, description)
- Server URLs
- Security schemes
- Schema definitions
- API file paths for documentation scanning

## 🛠️ Troubleshooting

**Swagger UI not loading?**
- Ensure `swagger-jsdoc` and `swagger-ui-express` are installed
- Check that `config/swagger.js` is properly configured
- Verify the `/api-docs` route is registered in `server.js`

**Endpoints not showing?**
- Ensure JSDoc comments are properly formatted
- Check that route files are included in `apis` array in `config/swagger.js`
- Restart the server after adding new annotations

**Authentication not working in UI?**
- Ensure tokens are valid Firebase ID tokens
- Check that `bearerAuth` security scheme is configured
- Verify the token hasn't expired
