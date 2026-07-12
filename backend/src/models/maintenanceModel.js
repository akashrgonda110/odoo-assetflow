import { query } from '../config/db.js';

export const MaintenanceModel = {
  async findAll({ asset_id, status, raised_by, priority, limit = 50, offset = 0 } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (asset_id)  { conds.push(`mr.asset_id = $${idx++}`);  params.push(asset_id); }
    if (status)    { conds.push(`mr.status = $${idx++}`);    params.push(status); }
    if (raised_by) { conds.push(`mr.raised_by = $${idx++}`); params.push(raised_by); }
    if (priority)  { conds.push(`mr.priority = $${idx++}`);  params.push(priority); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT mr.*,
              a.asset_tag, a.name AS asset_name,
              rb.name AS raised_by_name,
              at_.name AS assigned_to_name,
              ap.name AS approved_by_name
       FROM maintenance_requests mr
       LEFT JOIN assets a   ON a.id   = mr.asset_id
       LEFT JOIN users  rb  ON rb.id  = mr.raised_by
       LEFT JOIN users  at_ ON at_.id = mr.assigned_to
       LEFT JOIN users  ap  ON ap.id  = mr.approved_by
       ${where}
       ORDER BY mr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT mr.*,
              a.asset_tag, a.name AS asset_name,
              rb.name  AS raised_by_name,
              at_.name AS assigned_to_name,
              ap.name  AS approved_by_name
       FROM maintenance_requests mr
       LEFT JOIN assets a   ON a.id   = mr.asset_id
       LEFT JOIN users  rb  ON rb.id  = mr.raised_by
       LEFT JOIN users  at_ ON at_.id = mr.assigned_to
       LEFT JOIN users  ap  ON ap.id  = mr.approved_by
       WHERE mr.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create({ asset_id, raised_by, issue_desc, priority = 'medium', photo_url }) {
    const { rows } = await query(
      `INSERT INTO maintenance_requests (asset_id, raised_by, issue_desc, priority, photo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [asset_id, raised_by ?? null, issue_desc, priority, photo_url ?? null]
    );
    return rows[0];
  },

  async approve(id, approved_by) {
    const { rows } = await query(
      `UPDATE maintenance_requests
       SET status = 'approved', approved_by = $2, approved_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, approved_by]
    );
    return rows[0] ?? null;
  },

  async reject(id, approved_by, rejection_note) {
    const { rows } = await query(
      `UPDATE maintenance_requests
       SET status = 'rejected', approved_by = $2, rejection_note = $3, approved_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, approved_by, rejection_note ?? null]
    );
    return rows[0] ?? null;
  },

  async assignTechnician(id, assigned_to) {
    const { rows } = await query(
      `UPDATE maintenance_requests
       SET status = 'technician_assigned', assigned_to = $2, assigned_at = NOW()
       WHERE id = $1 AND status = 'approved'
       RETURNING *`,
      [id, assigned_to]
    );
    return rows[0] ?? null;
  },

  async startProgress(id) {
    const { rows } = await query(
      `UPDATE maintenance_requests
       SET status = 'in_progress'
       WHERE id = $1 AND status = 'technician_assigned'
       RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },

  async resolve(id, resolution_note) {
    const { rows } = await query(
      `UPDATE maintenance_requests
       SET status = 'resolved', resolution_note = $2, resolved_at = NOW()
       WHERE id = $1 AND status = 'in_progress'
       RETURNING *`,
      [id, resolution_note ?? null]
    );
    return rows[0] ?? null;
  },

  async countByStatus() {
    const { rows } = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM maintenance_requests
       GROUP BY status`
    );
    return rows;
  },

  async countTodayResolved() {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM maintenance_requests
       WHERE status = 'resolved'
         AND resolved_at::date = CURRENT_DATE`
    );
    return rows[0].count;
  },
};
