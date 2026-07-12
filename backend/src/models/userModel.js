import { query } from '../config/db.js';

export const UserModel = {
  async findByEmail(email) {
    const { rows } = await query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.phone, u.avatar_url,
              u.department_id, u.created_at, u.updated_at,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create({ name, email, password, role = 'employee', department_id, phone }) {
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role, department_id, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, is_active, department_id, phone, created_at, updated_at`,
      [name, email, password, role, department_id ?? null, phone ?? null]
    );
    return rows[0];
  },

  async findAll({ limit = 50, offset = 0, role, department_id, is_active, search } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (role)          { conds.push(`u.role = $${idx++}`);          params.push(role); }
    if (department_id) { conds.push(`u.department_id = $${idx++}`); params.push(department_id); }
    if (is_active !== undefined) { conds.push(`u.is_active = $${idx++}`); params.push(is_active); }
    if (search)        {
      conds.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.phone, u.avatar_url,
              u.department_id, u.created_at, u.updated_at,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async count({ role, department_id, is_active } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (role)          { conds.push(`role = $${idx++}`);          params.push(role); }
    if (department_id) { conds.push(`department_id = $${idx++}`); params.push(department_id); }
    if (is_active !== undefined) { conds.push(`is_active = $${idx++}`); params.push(is_active); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);
    return rows[0].total;
  },

  async update(id, fields) {
    const allowed = ['name', 'email', 'phone', 'avatar_url', 'department_id'];
    const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
    if (!entries.length) return null;

    const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values     = [id, ...entries.map(([, v]) => v)];

    const { rows } = await query(
      `UPDATE users SET ${setClauses}
       WHERE id = $1
       RETURNING id, name, email, role, is_active, phone, department_id, created_at, updated_at`,
      values
    );
    return rows[0] ?? null;
  },

  /** Admin-only: change role */
  async updateRole(id, role) {
    const { rows } = await query(
      `UPDATE users SET role = $2 WHERE id = $1
       RETURNING id, name, email, role, is_active, department_id, created_at, updated_at`,
      [id, role]
    );
    return rows[0] ?? null;
  },

  /** Admin-only: toggle active */
  async setActive(id, is_active) {
    const { rows } = await query(
      `UPDATE users SET is_active = $2 WHERE id = $1
       RETURNING id, name, email, role, is_active, department_id, created_at, updated_at`,
      [id, is_active]
    );
    return rows[0] ?? null;
  },

  async delete(id) {
    const { rowCount } = await query(`DELETE FROM users WHERE id = $1`, [id]);
    return rowCount > 0;
  },
};
