// Promote a Neon Auth user: pnpm db:set-role <email> <student|isc_admin|welfare_staff> [--owner]
// The user must have signed up first. Roles are only changeable here or via SQL.
import { config } from "dotenv";
config({ path: ".env.local" });

const ROLES = ["student", "isc_admin", "welfare_staff"] as const;

async function main() {
  const owner = process.argv.includes("--owner");
  const [email, role] = process.argv.slice(2).filter((a) => a !== "--owner");
  if (owner && role !== "isc_admin") throw new Error("--owner needs the isc_admin role.");
  if (!email || !ROLES.includes(role as (typeof ROLES)[number])) {
    console.error(`Usage: pnpm db:set-role <email> <${ROLES.join("|")}>`);
    process.exit(1);
  }
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`select id, name from neon_auth."user" where lower(email) = lower(${email})`;
  if (!users.length) throw new Error(`No Neon Auth user with email ${email}. Sign up first.`);
  const { id, name } = users[0];
  await sql`insert into profiles (user_id, name, role) values (${id}, ${name || email.split("@")[0]}, ${role})
            on conflict (user_id) do update set role = excluded.role`;
  if (owner) await sql`update profiles set is_owner = true where user_id = ${id}`;
  // Audit trail for the committee handover (needs the audit_log migration).
  await sql`insert into audit_log (actor_id, actor_name, actor_role, action, entity_type, entity_id, summary)
            values ('cli', 'Operator (CLI)', 'operator', 'role.cli', 'user', ${id}, ${`Role set to ${role} for ${name || email.split("@")[0]}`})`;
  console.log(`${email} is now ${role}${owner ? " (owner)" : ""}.`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
