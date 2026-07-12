import { query } from '../config/db.js';

export const AssetCategoryModel = {
  async findAll() {
    const { rows } = await query(
      `SELECT ac.*,
              COUNT(a.id)::int AS asset_count
       FROM asset_categories ac
       LEFT JOIN assets a ON a.category_id = ac.id
       GROUP BY ac.id
       ORDER BY ac.name ASC`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT ac.*,
              COUNT(a.id)::int AS asset_count
       FROM asset_categories ac
       LEFT JOIN assets a ON a.category_id = ac.id
       WHERE ac.id = $1
       GROUP BY ac.id`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findByName(name) {
    const { rows } = await query(
      `SELECT * FROM asset_categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    return rows[0] ?? null;
  },

  async create({ name, description, custom_fields = [] }) {
    const { rows } = await query(
      `INSERT INTO asset_categories (name, description, custom_fields)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description ?? null, JSON.stringify(custom_fields)]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['name', 'description', 'custom_fields'];
    const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
    if (!entries.length) return null;

    const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values     = [id, ...entries.map(([, v]) => v)];

    const { rows } = await query(
      `UPDATE asset_categories SET ${setClauses}
       WHERE id = $1
       RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async delete(id) {
    const { rowCount } = await query(
      `DELETE FROM asset_categories WHERE id = $1`,
      [id]
    );
    return rowCount > 0;
  },
};
