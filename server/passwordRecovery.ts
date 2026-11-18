import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { passwordResetTokens, users } from '../drizzle/schema';

/** Atomically consumes an unexpired token and changes only its owner's password. */
export async function consumePasswordReset(
  db: NodePgDatabase,
  token: string,
  passwordHash: string,
): Promise<boolean> {
  return db.transaction(async tx => {
    // PostgreSQL rechecks this predicate after a competing row lock is released.
    // Database wall-clock time also covers tokens expiring while bcrypt/locks wait.
    const claimed = await tx.update(passwordResetTokens)
      .set({ usedAt: sql`clock_timestamp()` })
      .where(and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, sql`clock_timestamp()`),
      ))
      .returning({ userId: passwordResetTokens.userId });
    if (claimed.length !== 1) return false;
    const updated = await tx.update(users)
      .set({ passwordHash, updatedAt: sql`clock_timestamp()` })
      .where(eq(users.id, claimed[0].userId))
      .returning({ id: users.id });
    // A missing user or failed update rolls the token claim back too.
    if (updated.length !== 1) throw new Error('Password recovery update failed');
    return true;
  });
}
