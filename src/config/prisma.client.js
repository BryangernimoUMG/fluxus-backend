const { PrismaClient } = require('../../generated/prisma');

// Cache prisma client in dev and across serverless hot reloads
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
