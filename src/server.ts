import app from './app';
import { config } from './config';
import { prisma } from './prisma/client';
import { logger } from './utils/logger';

const PORT = config.port;

async function startServer() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 SkillSwap server running on http://localhost:${PORT}`);
      logger.info(`📁 Environment: ${config.env}`);
      logger.info(`🔗 API Base: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ msg: 'Unhandled rejection', reason });
    });

    process.on('uncaughtException', (err) => {
      logger.error({ msg: 'Uncaught exception', error: err.message });
      process.exit(1);
    });
  } catch (err) {
    logger.error({ msg: 'Failed to start server', error: err });
    process.exit(1);
  }
}

startServer();
