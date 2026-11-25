// Clear rows owned by the E2E test accounts so `pnpm test:e2e` can run again: pnpm db:reset-e2e
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const emails = ["STUDENT", "ADMIN", "WELFARE"].map((r) => process.env[`E2E_${r}_EMAIL`]).filter(Boolean) as string[];
  if (!emails.length) throw new Error("No E2E_*_EMAIL vars set in .env.local.");
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const ids = (await sql`select id from neon_auth."user" where lower(email) = any(${emails.map((e) => e.toLowerCase())})`).map((u) => u.id as string);
  for (const table of ["buddy_requests", "volunteers", "memberships", "rsvps", "arrival_progress"]) {
    await sql.query(`delete from ${table} where user_id = any($1)`, [ids]);
  }
  console.log(`Reset E2E data for ${ids.length} test accounts.`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
