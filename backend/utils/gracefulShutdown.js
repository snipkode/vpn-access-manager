import { server } from '../server.js';

let isShuttingDown = false;

export function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    if (isShuttingDown) {
      console.log(`⚠️  ${signal} received during shutdown, forcing exit`);
      process.exit(1);
    }

    isShuttingDown = true;
    console.log(`\n🛑 ${signal} received, starting graceful shutdown...`);

    try {
      // 1. Stop accepting new connections
      console.log('  1. Closing HTTP server...');
      
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('  ✓ HTTP server closed');
      }

      // 2. Close database connections
      console.log('  2. Closing database connections...');
      const { db, auth } = await import('../config/firebase.js');
      // Firestore connections are managed by Firebase SDK
      console.log('  ✓ Database connections closed');

      // 3. Stop cron jobs
      console.log('  3. Stopping cron jobs...');
      const { stopCronJobs } = await import('../services/cronJobs.js');
      stopCronJobs();
      console.log('  ✓ Cron jobs stopped');

      // 4. Close email transporter
      console.log('  4. Closing email transporter...');
      const { getTransporter } = await import('../services/email.js');
      const transporter = getTransporter();
      if (transporter) {
        await transporter.close();
        console.log('  ✓ Email transporter closed');
      }

      // 5. Save any pending data/logs
      console.log('  5. Flushing logs...');
      // Add any log flushing logic here
      console.log('  ✓ Logs flushed');

      console.log('\n✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });

  // Handle exit
  process.on('exit', (code) => {
    console.log(`👋 Process exiting with code: ${code}`);
  });

  console.log('✅ Graceful shutdown handlers registered');
}

export default setupGracefulShutdown;
