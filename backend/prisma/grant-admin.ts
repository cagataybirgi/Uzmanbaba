import { PrismaClient } from "@prisma/client";

/**
 * Grants (or revokes) admin to an existing account. The only way an account
 * becomes admin — on purpose, there is no API endpoint for it.
 *
 *   npm run admin:grant -- you@example.com
 *   npm run admin:grant -- you@example.com --revoke
 *
 * Uses DATABASE_URL from backend/.env, so it acts on whichever database
 * that points at. The account must already exist (register on the site first).
 */

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:grant -- <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with email ${email}. Register it on the site first.`);
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: !revoke } });
  console.log(revoke ? `Revoked admin from ${email}.` : `${email} is now an admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
