import postgres from 'postgres';
import databaseEnv from './shared/databaseEnv.cjs';
import adminBootstrap from './server/adminBootstrap.cjs';

const bootstrap = await adminBootstrap.prepareAdminBootstrap(process.env);
const DB_URL = databaseEnv.resolvePostgresConnectionUrl(process.env);

async function main() {
  let sql;
  try {
    sql = postgres(DB_URL, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      idle_timeout: 10,
      connect_timeout: 15
    });
    await sql`SELECT version()`;
    console.log('PostgreSQL connection verified.');

    await sql`
      INSERT INTO users ("openId", "name", "email", "passwordHash", "loginMethod", "role", "platformRole", "lastSignedIn", "createdAt", "updatedAt")
      VALUES (
        ${bootstrap.openId},
        ${bootstrap.name},
        ${bootstrap.email},
        ${bootstrap.passwordHash},
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
    console.log('Admin bootstrap completed.');
  } catch {
    console.error('Admin bootstrap failed.');
    process.exitCode = 1;
  } finally {
    if (sql) {
      try {
        await sql.end();
      } catch {
        console.error('Admin bootstrap connection cleanup failed.');
        process.exitCode = 1;
      }
    }
  }
}

await main();
