import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * node-pg currently treats sslmode=require as verify-full, which rejects
 * Supabase's pooler cert chain (P1011). Opt into libpq-compatible require.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
function pgConnectionString(raw: string): string {
  const url = new URL(raw);
  if (!url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

function createPrismaClient() {
  const connectionString =
    process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Missing POSTGRES_PRISMA_URL (or POSTGRES_URL)");
  }
  const adapter = new PrismaPg({
    connectionString: pgConnectionString(connectionString),
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
