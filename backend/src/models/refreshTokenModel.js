import { query } from '../config/db.js';

export const RefreshTokenModel = {
  /** Store a hashed refresh token for a user */
  async create({ userId, tokenHash, expiresAt }) {
    const { rows } = await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return rows[0];
  },

  /** Find a valid (non-revoked, non-expired) token by its hash */
  async findValid(tokenHash) {
    const { rows } = await query(
      `SELECT rt.*, u.id as user_id, u.email, u.role, u.name, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
         AND rt.revoked    = false
         AND rt.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  /** Revoke a single token (logout from current device) */
  async revoke(tokenHash) {
    const { rowCount } = await query(
      `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
      [tokenHash]
    );
    return rowCount > 0;
  },

  /** Revoke ALL tokens for a user (logout from all devices) */
  async revokeAllForUser(userId) {
    await query(
      `UPDATE refresh_tokens SET revoked = true
       WHERE user_id = $1 AND revoked = false`,
      [userId]
    );
  },

  /** Clean up expired tokens (run via a cron job) */
  async deleteExpired() {
    const { rowCount } = await query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true`
    );
    return rowCount;
  },
};
