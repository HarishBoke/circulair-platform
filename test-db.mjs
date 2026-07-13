import pg from 'pg';
const { Pool } = pg;
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.log('DATABASE_URL not set');
  process.exit(1);
}
const masked = rawUrl.replace(/:\/\/[^@]+@/, '://***@');
console.log('DB URL:', masked);

// Try without SSL first
try {
  const pool = new Pool({ connectionString: rawUrl, ssl: false });
  const client = await pool.connect();
  const res = await client.query('SELECT COUNT(*) FROM batteries');
  console.log('Connected (no SSL). Batteries:', res.rows[0].count);
  client.release();
  await pool.end();
} catch (e1) {
  console.log('No SSL failed:', e1.message);
  // Try with SSL
  try {
    const pool2 = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });
    const client2 = await pool2.connect();
    const res2 = await client2.query('SELECT COUNT(*) FROM batteries');
    console.log('Connected (SSL). Batteries:', res2.rows[0].count);
    client2.release();
    await pool2.end();
  } catch (e2) {
    console.log('SSL also failed:', e2.message);
  }
}
