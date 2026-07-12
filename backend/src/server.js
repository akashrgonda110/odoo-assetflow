import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  // Verify DB connection before accepting traffic
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
  });

  // ─── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force-close if it takes too long
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled rejections — log and exit so the process manager can restart
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    server.close(() => process.exit(1));
  });
};

startServer();
