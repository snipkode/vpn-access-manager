import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  // Firebase (optional - only needed if DB_ENABLED=false)
  // 'FIREBASE_PROJECT_ID',
  // 'FIREBASE_CLIENT_EMAIL',
  // 'FIREBASE_PRIVATE_KEY',
  
  // Server
  'PORT',
];

const optionalEnvVars = [
  // WireGuard
  'WG_INTERFACE',
  'WG_SERVER_PUBLIC_KEY',
  'WG_SERVER_ENDPOINT',
  'WG_DNS',
  'WG_SUBNET',
  
  // Email
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_NOTIFICATION_EMAIL',
  
  // Frontend URLs
  'FRONTEND_URL',
  'ADMIN_DASHBOARD_URL',
];

class EnvironmentValidationError extends Error {
  constructor(missingVars) {
    super(`Missing required environment variables: ${missingVars.join(', ')}`);
    this.name = 'EnvironmentValidationError';
    this.missingVars = missingVars;
  }
}

export function validateEnvironment() {
  const missingVars = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      missingVars.push(varName);
    }
  });

  // Validate PORT is a number
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('PORT must be a valid number between 1 and 65535');
    }
  }

  if (missingVars.length > 0) {
    throw new EnvironmentValidationError(missingVars);
  }

  // Log warnings for missing optional variables
  const missingOptional = optionalEnvVars.filter(varName => 
    !process.env[varName] || process.env[varName].trim() === ''
  );

  if (missingOptional.length > 0) {
    console.log('⚠️  Missing optional environment variables:', missingOptional.join(', '));
  }

  console.log('✅ Environment validation passed');
  console.log(`📝 Loaded ${requiredEnvVars.length - missingVars.length} required vars, ${optionalEnvVars.length - missingOptional.length}/${optionalEnvVars.length} optional vars`);

  return {
    required: requiredEnvVars.filter(v => process.env[v]),
    optional: missingOptional,
    allValid: missingVars.length === 0,
  };
}

// Environment validation middleware
export function environmentValidationMiddleware(req, res, next) {
  // Add environment info to request for debugging
  req.appEnv = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT,
    hasEmail: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    hasWireGuard: !!(process.env.WG_SERVER_PUBLIC_KEY),
  };
  
  next();
}

export default validateEnvironment;
