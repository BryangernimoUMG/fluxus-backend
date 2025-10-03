const { PrismaClient } = require('@prisma/client');

let prisma;

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  // En producción, una única instancia por proceso y logs mínimos
  prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  // En desarrollo, reutilizar la instancia en global para evitar crear múltiples conexiones
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  prisma = global.prisma;
}

// Manejo de cierre graceful (aplica para ambos entornos)
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
  } catch (_) {
    // noop
  }
});

module.exports = prisma;
