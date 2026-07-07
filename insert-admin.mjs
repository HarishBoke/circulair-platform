import postgres from 'postgres';

const DB_URL = 'postgresql://circulair_user:wKbtM8fh9EfLkjnLkoYqzL7EouQlTTSC@dpg-d95qdlcvikkc73e2aeig-a.oregon-postgres.render.com/circulair_production';

const sql = postgres(DB_URL, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  idle_timeout: 10,
  connect_timeout: 15
});

async function main() {
  try {
    const result = await sql`SELECT version()`;
    console.log('Connected! PostgreSQL version:', result[0].version.substring(0, 60));
    
    const insertResult = await sql`
      INSERT INTO users ("openId", "name", "email", "passwordHash", "loginMethod", "role", "platformRole", "lastSignedIn", "createdAt", "updatedAt")
      VALUES (
        'admin-local-001',
        'Platform Admin',
        'admin@circulair.energy',
        '$2b$12$/dMjgxn9vVZe8aIN.jtNeOSyby0x93avGo/gHRWBU74BM.t4QRpTm',
        'local',
        'admin',
        'oem',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT ("email") DO UPDATE SET 
        "role" = 'admin', 
        "passwordHash" = EXCLUDED."passwordHash",
        "updatedAt" = NOW()
      RETURNING id, email, role
    `;
    console.log('Admin user created/updated:', JSON.stringify(insertResult[0]));
    
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    try { await sql.end(); } catch {}
    process.exit(1);
  }
}

main();
