import { query } from '../config/db.js';

/**
 * Data-access layer for the `users` table.
 * Controllers should never call `pool` / `query` directly —
 * always go through a model.
 */
export const UserModel = {
  /** Find a user by their email address */
  async findByEmail(email) {
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] ?? null;
  },

  /** Find a user by their UUID */
  async findById(id) {
    const { rows } = await query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  /** Create a new user, returns the safe (no-password) row */
  async create({ name, email, password, role = 'user' }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, password, role]
    );
    return rows[0];
  },

  /** Return all users (paginated) */
  async findAll({ limit = 20, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  /** Update mutable user fields */
  async update(id, fields) {
    const allowed  = ['name', 'email'];
    const updates  = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (!updates.length) return null;

    const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values     = [id, ...updates.map(([, v]) => v)];

    const { rows } = await query(
      `UPDATE users SET ${setClauses}
       WHERE id = $1
       RETURNING id, name, email, role, created_at, updated_at`,
      values
    );
    return rows[0] ?? null;
  },

  /** Hard-delete a user */
  async delete(id) {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
