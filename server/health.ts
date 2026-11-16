import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from './db';

export async function handleHealth(_req: Request, res: Response): Promise<void> {
  let ready = false;
  try {
    const db = await getDb();
    if (db) { await db.execute(sql`select 1`); ready = true; }
  } catch { /* Never return database error details or credentials publicly. */ }
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    db: ready ? 'connected' : 'disconnected',
    dbType: 'postgresql',
    env: process.env.NODE_ENV || 'development',
  });
}
