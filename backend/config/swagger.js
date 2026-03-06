import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VPN Access Backend API',
      version: '1.0.0',
      description: 'API documentation for VPN Access Manager - Manage VPN subscriptions, billing, and user access',
      contact: {
        name: 'API Support',
        email: 'support@vpnaccess.local',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.vpnaccess.local',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token (Bearer token)',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            uid: { type: 'string', example: 'abc123xyz' },
            email: { type: 'string', example: 'user@example.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            vpn_enabled: { type: 'boolean', example: true },
            display_name: { type: 'string', nullable: true, example: 'John Doe' },
            phone: { type: 'string', nullable: true, example: '+628123456789' },
            whatsapp: { type: 'string', nullable: true, example: '+628123456789' },
            subscription_plan: { type: 'string', nullable: true, example: 'monthly' },
            subscription_end: { type: 'string', nullable: true, format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Device: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'device123' },
            user_id: { type: 'string', example: 'abc123xyz' },
            device_name: { type: 'string', example: 'iPhone 14' },
            public_key: { type: 'string', example: 'wg_pubkey_...' },
            ip_address: { type: 'string', example: '10.0.0.2' },
            status: { type: 'string', enum: ['active', 'revoked'], example: 'active' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'pay123' },
            user_id: { type: 'string', example: 'abc123xyz' },
            amount: { type: 'integer', example: 50000 },
            plan: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], example: 'monthly' },
            plan_label: { type: 'string', example: 'Monthly' },
            duration_days: { type: 'integer', example: 30 },
            bank_from: { type: 'string', example: 'BCA' },
            transfer_date: { type: 'string', format: 'date-time' },
            proof_image_url: { type: 'string', example: '/uploads/proofs/proof-123.jpg' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'pending' },
            admin_note: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CreditTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'txn123' },
            user_id: { type: 'string', example: 'abc123xyz' },
            type: { type: 'string', enum: ['transfer', 'topup', 'refund', 'deduction'], example: 'transfer' },
            amount: { type: 'integer', example: 10000 },
            status: { type: 'string', enum: ['pending', 'completed', 'blocked', 'cancelled'], example: 'completed' },
            description: { type: 'string', example: 'Transfer to user@example.com' },
            from_user_id: { type: 'string', nullable: true },
            to_user_id: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Referral: {
          type: 'object',
          properties: {
            referral_code: { type: 'string', example: 'JOHN2024' },
            referral_link: { type: 'string', example: 'http://localhost:3000/signup?ref=JOHN2024' },
            tier: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum'], example: 'bronze' },
            total_referrals: { type: 'integer', example: 5 },
            total_earnings: { type: 'integer', example: 50000 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Unauthorized' },
            message: { type: 'string', example: 'Invalid token' },
            details: { type: 'string', nullable: true },
          },
        },
        Health: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string', example: 'development' },
            uptime: { type: 'number', example: 3600.5 },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check and API info endpoints' },
      { name: 'Auth', description: 'Authentication and user verification' },
      { name: 'VPN', description: 'VPN configuration and device management' },
      { name: 'User', description: 'User profile and preferences' },
      { name: 'Billing', description: 'Payment submission and subscription management' },
      { name: 'Credit', description: 'Credit balance and transfers' },
      { name: 'Referral', description: 'Referral program management' },
      { name: 'Admin', description: 'Admin-only user and device management' },
      { name: 'Admin Billing', description: 'Admin payment management' },
      { name: 'Admin Credit', description: 'Admin credit management and fraud detection' },
      { name: 'Admin Settings', description: 'System configuration' },
      { name: 'Admin Backup', description: 'Backup and restore operations' },
    ],
  },
  apis: [
    './routes/*.js',
    './server.js',
    './config/swagger-routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
