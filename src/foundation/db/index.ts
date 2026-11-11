import { PrismaClient, type Prisma } from "@prisma/client";

// Foundation-internal. Apps must not import this (enforced by ESLint and tests/architecture.test.ts).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Prisma.TransactionClient | PrismaClient;
