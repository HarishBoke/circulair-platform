import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    // Check actual column names in batteries table
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'batteries' 
      ORDER BY ordinal_position
    `);
    console.log("=== BATTERIES TABLE COLUMNS ===");
    cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check users
    const users = await client.query("SELECT id, email FROM users LIMIT 3");
    console.log("\n=== USERS ===");
    users.rows.forEach(r => console.log(`  id=${r.id} email=${r.email}`));
    const uid = users.rows[0]?.id || 1;

    // Try a minimal direct insert using the actual column names
    console.log("\n=== TESTING DIRECT INSERT ===");
    try {
      const result = await client.query(`
        INSERT INTO batteries(
          bpan, "countryCode", "manufacturerId", "capacityCode", "capacityKwh",
          "chemistryCode", chemistry, "voltageCode", "voltageV", "cellOriginCode",
          "cellOriginCountry", "extinguisherClass", "mfgYear", "mfgMonth", "mfgDay",
          "factoryCode", "serialNumber", status, "registeredById", "ownerId"
        ) VALUES(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING id
      `, [
        "DIAG-TEST-001", "IN", "TM1", "10", "100",
        "L", "LFP", "48", "480", "IN",
        "India", "A", 2023, 6, 15,
        "A", "0001", "operational", uid, uid
      ]);
      console.log("  ✓ Direct insert OK, id:", result.rows[0]?.id);
      // Clean up
      await client.query("DELETE FROM batteries WHERE bpan = 'DIAG-TEST-001'");
    } catch (e: any) {
      console.error("  ✗ Direct insert FAILED:", e.message);
    }

    // Check if there's a unique constraint issue
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'batteries'
    `);
    console.log("\n=== BATTERIES CONSTRAINTS ===");
    constraints.rows.forEach(r => console.log(`  ${r.constraint_name}: ${r.constraint_type}`));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
