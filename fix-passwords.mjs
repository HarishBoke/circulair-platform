/**
 * fix-passwords.mjs
 * Sets bcrypt-hashed passwords for all seeded users in production.
 * Run via: node fix-passwords.mjs
 *
 * Admin:  harish@setoo.co        → CirculAIr@Admin2026!
 * Users:  all other seeded users → CirculAIr@User2026!
 */
import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const ADMIN_PASSWORD = "CirculAIr@Admin2026!";
const USER_PASSWORD = "CirculAIr@User2026!";
const BCRYPT_ROUNDS = 12;

const SEEDED_EMAILS = [
  // Admin
  "harish@setoo.co",
  // OEM users
  "rajesh.kumar@tatamotors.com",
  "priya.sharma@mahindra.com",
  "kiran.desai@olaelectric.com",
  // Manufacturers
  "amit.patel@exideenergy.com",
  "sunita.rao@luminousenergy.com",
  "vikram.singh@amara-raja.com",
  // Recyclers
  "deepa.nair@attero.in",
  "rahul.gupta@lohum.com",
  "anita.joshi@batx.in",
  // BESS Developers
  "suresh.menon@greenko.com",
  "kavitha.reddy@renew-power.com",
  "arjun.iyer@torrent-power.com",
  // Traders
  "meera.k@secondlife.in",
  "nikhil.shah@evbatteryexchange.com",
  "pooja.verma@batterymart.in",
  // Government
  "dr.arun.saxena@mnre.gov.in",
  "ms.lakshmi.prasad@cpcb.gov.in",
  // Logistics
  "ravi.logistics@dtdc.com",
  "sanjay.fleet@bluedart.com",
  // Research
  "dr.priya.iit@iitbombay.ac.in",
  "prof.kumar@iiserbhopal.ac.in",
  // Traders
  "meera.k@secondlife.in",
  "meera.krishnan@secondlife.in",
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("✅ Connected to database");

  try {
    // Hash passwords
    console.log("\n🔐 Hashing passwords...");
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    const userHash = await bcrypt.hash(USER_PASSWORD, BCRYPT_ROUNDS);
    console.log("  ✓ Passwords hashed");

    // Update admin
    const adminResult = await client.query(
      `UPDATE users SET "passwordHash" = $1, "loginMethod" = 'password', "updatedAt" = NOW()
       WHERE email = 'harish@setoo.co' RETURNING id, email`,
      [adminHash]
    );
    if (adminResult.rows.length > 0) {
      console.log(`  ✓ Admin password set for: ${adminResult.rows[0].email}`);
    } else {
      console.warn("  ⚠ Admin user harish@setoo.co not found");
    }

    // Update all other seeded users
    let updated = 0;
    for (const email of SEEDED_EMAILS) {
      if (email === "harish@setoo.co") continue;
      try {
        const result = await client.query(
          `UPDATE users SET "passwordHash" = $1, "loginMethod" = 'password', "updatedAt" = NOW()
           WHERE email = $2 RETURNING id, email`,
          [userHash, email]
        );
        if (result.rows.length > 0) {
          updated++;
          console.log(`  ✓ Password set for: ${result.rows[0].email}`);
        }
      } catch (e) {
        console.warn(`  ⚠ Could not update ${email}: ${e.message}`);
      }
    }

    // Also update ALL users that have null passwordHash and loginMethod='password'
    const bulkResult = await client.query(
      `UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW()
       WHERE "passwordHash" IS NULL AND "loginMethod" = 'password' RETURNING id, email`,
      [userHash]
    );
    if (bulkResult.rows.length > 0) {
      console.log(`\n  ✓ Bulk updated ${bulkResult.rows.length} additional users with null passwordHash:`);
      bulkResult.rows.forEach(r => console.log(`    - ${r.email}`));
    }

    console.log(`\n✅ Done! Updated ${updated} named users + ${bulkResult.rows.length} bulk users`);
    console.log("\n📋 Login credentials:");
    console.log("  Admin:  harish@setoo.co          → CirculAIr@Admin2026!");
    console.log("  Users:  (any seeded user email)  → CirculAIr@User2026!");

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
