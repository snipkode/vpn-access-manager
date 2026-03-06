import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

// Route imports
import authRoutes from './routes/auth.js';
import vpnRoutes from './routes/vpn.js';
import adminRoutes from './routes/admin.js';
import billingRoutes from './routes/billing.js';
import adminBillingRoutes from './routes/admin-billing.js';
import paymentSettingsRoutes from './routes/payment-settings.js';
import creditRoutes from './routes/credit.js';
import adminCreditRoutes from './routes/admin-credit.js';
import settingsRoutes from './routes/settings.js';
import userRoutes from './routes/user.js';
import adminBackupRoutes from './routes/admin-backup.js';
import referralRoutes from './routes/referral.js';
import adminReferralRoutes from './routes/admin-referral.js';

// Middleware imports
import { rateLimiters, checkBlockedIP, logRequest } from './middleware/rateLimit.js';
import { validateEnvironment, environmentValidationMiddleware } from './middleware/validateEnv.js';
import { securityMiddleware, addSecurityHeaders } from './middleware/security.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { auditMiddleware } from './middleware/auditLog.js';

// Service initialization
import { initializeEmailTransporter } from './services/email.js';
import { initializeCronJobs, stopCronJobs } from './services/cronJobs.js';
import { scheduleFileCleanup } from './services/fileCleanup.js';
import { initializeScheduledBackups, initializeScheduledCleanup } from './services/backupSchedule.js';
import { printIndexInstructions } from './config/firestoreIndexes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate environment on startup
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ Environment validation failed:\n' + error.message);
  if (error.missingVars) {
    console.error('\nMissing:', error.missingVars.join(', '));
  }
  process.exit(1);
}

// Security & middleware setup
securityMiddleware(app);
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(addSecurityHeaders);
app.use(sanitizeBody);
app.use(checkBlockedIP);
app.use(logRequest);
app.use(auditMiddleware);
app.use(environmentValidationMiddleware);
app.use('/api', rateLimiters.general);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vpn', vpnRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin/billing', adminBillingRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/admin/credit', adminCreditRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin/backup', adminBackupRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/admin/referral', adminReferralRoutes);
app.use('/uploads', express.static('uploads'));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VPN Access API Docs',
}));
app.use('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health check and API info endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Health'
 *
 * /api:
 *   get:
 *     summary: API information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string, example: 'VPN Access Backend API' }
 *                 version: { type: string, example: '1.0.0' }
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     auth: { type: string }
 *                     vpn: { type: string }
 *                     billing: { type: string }
 *                     credit: { type: string }
 *                     admin: { type: string }
 */
// Health & info endpoints
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  environment: req.appEnv,
  uptime: process.uptime(),
}));

app.get('/api', (req, res) => res.json({
  name: 'VPN Access Backend API',
  version: '1.0.0',
  endpoints: { auth: '/api/auth', vpn: '/api/vpn', billing: '/api/billing', credit: '/api/credit', admin: '/api/admin' },
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', { message: err.message, path: req.path, method: req.method });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation Error', message: err.message });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File Too Large' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `${req.method} ${req.path} not found` });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 VPN Access Backend running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}\n`);

  await initializeEmailTransporter();
  setTimeout(async () => {
    await initializeCronJobs();
    scheduleFileCleanup();
    await initializeScheduledBackups();
    await initializeScheduledCleanup();
  }, 2000);
  printIndexInstructions();
});

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return process.exit(1);
  isShuttingDown = true;

  console.log(`\n🛑 ${signal} received, shutting down...`);

  try {
    await new Promise((resolve) => server.close(resolve));
    console.log('  ✓ HTTP server closed');

    stopCronJobs();
    console.log('  ✓ Cron jobs stopped');

    const { getTransporter } = await import('./services/email.js');
    const transporter = getTransporter();
    if (transporter) {
      await transporter.close();
      console.log('  ✓ Email transporter closed');
    }

    console.log('✅ Shutdown completed\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown error:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

export { server };
export default app;
