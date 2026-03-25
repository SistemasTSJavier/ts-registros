import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://127.0.0.1:5432/prisma_placeholder";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPg: PrismaPg | undefined;
};

const adapter =
  globalForPrisma.prismaPg ?? new PrismaPg({ connectionString });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPg = adapter;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
