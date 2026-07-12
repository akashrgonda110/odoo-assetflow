import { query } from '../config/db.js';

export const DepartmentModel = {
  async findAll({ status } = {}) {
    let sql = `
      SELECT d.*, 
             u.name  AS head_name,
             u.email AS head_email,
             p.name  AS parent_name
      FROM departments d
      LEFT JOIN users       u ON u.id = d.head_id
      LEFT JOIN departments p ON p.id = d.parent_id
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` WHERE d.status = $1`;
    }
    sql += ` ORDER BY d.name ASC`;
    const { rows } = await query(sql, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT d.*,
              u.name  AS head_name,
              u.email AS head_email,
              p.name  AS parent_name
       FROM departments d
       LEFT JOIN users       u ON u.id = d.head_id
       LEFT JOIN departments p ON p.id = d.parent_id
       WHERE d.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findByName(name) {
    const { rows } = await query(
      `SELECT * FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    return rows[0] ?? null;
  },

  async create({ name, description, head_id, parent_id, status = 'active' }) {
    const { rows } = await query(
      `INSERT INTO departments (name, description, head_id, parent_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description ?? null, head_id ?? null, parent_id ?? null, status]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name', 'description', 'head_id', 'parent_id', 'status'];
    const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
    if (!entries.length) return null;

    const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values     = [id, ...entries.map(([, v]) => v)];

    const { rows } = await query(
      `UPDATE departments SET ${setClauses}
       WHERE id = $1
       RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async delete(id) {
    const { rowCount } = await query(`DELETE FROM departments WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  async getEmployeeCount(departmentId) {
    const { rows } = await query(
      `SELECT COUNT(*) AS count FROM users WHERE department_id = $1 AND is_active = true`,
      [departmentId]
    );
    return parseInt(rows[0].count, 10);
  },
};
