import { query } from '../config/db.js';

export const AllocationModel = {
  /** Get the current active allocation for an asset */
  async findActiveByAsset(asset_id) {
    const { rows } = await query(
      `SELECT al.*,
              u.name  AS assigned_to_name,
              u.email AS assigned_to_email,
              d.name  AS assigned_to_dept_name,
              ab.name AS allocated_by_name
       FROM allocations al
       LEFT JOIN users       u  ON u.id  = al.assigned_to_user
       LEFT JOIN departments d  ON d.id  = al.assigned_to_dept
       LEFT JOIN users       ab ON ab.id = al.allocated_by
       WHERE al.asset_id = $1 AND al.is_active = true
       LIMIT 1`,
      [asset_id]
    );
    return rows[0] ?? null;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT al.*,
              a.asset_tag, a.name AS asset_name,
              u.name  AS assigned_to_name,
              u.email AS assigned_to_email,
              d.name  AS dept_name,
              ab.name AS allocated_by_name
       FROM allocations al
       LEFT JOIN assets      a  ON a.id  = al.asset_id
       LEFT JOIN users       u  ON u.id  = al.assigned_to_user
       LEFT JOIN departments d  ON d.id  = al.assigned_to_dept
       LEFT JOIN users       ab ON ab.id = al.allocated_by
       WHERE al.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findAll({ user_id, dept_id, is_active, overdue, limit = 50, offset = 0 } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (user_id !== undefined) { conds.push(`al.assigned_to_user = $${idx++}`); params.push(user_id); }
    if (dept_id !== undefined) { conds.push(`al.assigned_to_dept = $${idx++}`); params.push(dept_id); }
    if (is_active !== undefined) { conds.push(`al.is_active = $${idx++}`); params.push(is_active); }
    if (overdue) {
      conds.push(`al.is_active = true AND al.expected_return_at < CURRENT_DATE`);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT al.*,
              a.asset_tag, a.name AS asset_name,
              u.name  AS assigned_to_name,
              d.name  AS dept_name,
              ab.name AS allocated_by_name
       FROM allocations al
       LEFT JOIN assets      a  ON a.id  = al.asset_id
       LEFT JOIN users       u  ON u.id  = al.assigned_to_user
       LEFT JOIN departments d  ON d.id  = al.assigned_to_dept
       LEFT JOIN users       ab ON ab.id = al.allocated_by
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async create({ asset_id, assigned_to_user, assigned_to_dept, allocated_by, expected_return_at }) {
    const { rows } = await query(
      `INSERT INTO allocations
         (asset_id, assigned_to_user, assigned_to_dept, allocated_by, expected_return_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        asset_id,
        assigned_to_user ?? null,
        assigned_to_dept ?? null,
        allocated_by ?? null,
        expected_return_at ?? null,
      ]
    );
    return rows[0];
  },

  async returnAsset(id, { return_condition, return_notes }) {
    const { rows } = await query(
      `UPDATE allocations
       SET is_active       = false,
           returned_at     = NOW(),
           return_condition = $2,
           return_notes    = $3
       WHERE id = $1
       RETURNING *`,
      [id, return_condition ?? null, return_notes ?? null]
    );
    return rows[0] ?? null;
  },

  async countOverdue() {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM allocations
       WHERE is_active = true
         AND expected_return_at IS NOT NULL
         AND expected_return_at < CURRENT_DATE`
    );
    return rows[0].count;
  },

  async countUpcoming(days = 7) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM allocations
       WHERE is_active = true
         AND expected_return_at IS NOT NULL
         AND expected_return_at BETWEEN CURRENT_DATE AND CURRENT_DATE + $1`,
      [days]
    );
    return rows[0].count;
  },
};
