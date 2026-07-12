import { query } from '../config/db.js';

export const TransferModel = {
  async findAll({ asset_id, status, requested_by, limit = 50, offset = 0 } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (asset_id)     { conds.push(`tr.asset_id = $${idx++}`);      params.push(asset_id); }
    if (status)       { conds.push(`tr.status = $${idx++}`);         params.push(status); }
    if (requested_by) { conds.push(`tr.requested_by = $${idx++}`);  params.push(requested_by); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT tr.*,
              a.asset_tag, a.name AS asset_name,
              fu.name AS from_user_name,
              tu.name AS to_user_name,
              td.name AS to_dept_name,
              rb.name AS requested_by_name,
              ab.name AS approved_by_name
       FROM transfer_requests tr
       LEFT JOIN assets      a  ON a.id  = tr.asset_id
       LEFT JOIN users       fu ON fu.id = tr.from_user_id
       LEFT JOIN users       tu ON tu.id = tr.to_user_id
       LEFT JOIN departments td ON td.id = tr.to_dept_id
       LEFT JOIN users       rb ON rb.id = tr.requested_by
       LEFT JOIN users       ab ON ab.id = tr.approved_by
       ${where}
       ORDER BY tr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT tr.*,
              a.asset_tag, a.name AS asset_name,
              fu.name AS from_user_name,
              tu.name AS to_user_name,
              td.name AS to_dept_name,
              rb.name AS requested_by_name,
              ab.name AS approved_by_name
       FROM transfer_requests tr
       LEFT JOIN assets      a  ON a.id  = tr.asset_id
       LEFT JOIN users       fu ON fu.id = tr.from_user_id
       LEFT JOIN users       tu ON tu.id = tr.to_user_id
       LEFT JOIN departments td ON td.id = tr.to_dept_id
       LEFT JOIN users       rb ON rb.id = tr.requested_by
       LEFT JOIN users       ab ON ab.id = tr.approved_by
       WHERE tr.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create({ asset_id, from_user_id, to_user_id, to_dept_id, requested_by, reason }) {
    const { rows } = await query(
      `INSERT INTO transfer_requests
         (asset_id, from_user_id, to_user_id, to_dept_id, requested_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        asset_id,
        from_user_id ?? null,
        to_user_id   ?? null,
        to_dept_id   ?? null,
        requested_by ?? null,
        reason       ?? null,
      ]
    );
    return rows[0];
  },

  async updateStatus(id, { status, approved_by, rejection_note }) {
    let sql, params;
    if (status === 'approved') {
      sql    = `UPDATE transfer_requests SET status=$2, approved_by=$3, approved_at=NOW() WHERE id=$1 RETURNING *`;
      params = [id, status, approved_by ?? null];
    } else if (status === 'rejected') {
      sql    = `UPDATE transfer_requests SET status=$2, approved_by=$3, rejection_note=$4, approved_at=NOW() WHERE id=$1 RETURNING *`;
      params = [id, status, approved_by ?? null, rejection_note ?? null];
    } else if (status === 'completed') {
      sql    = `UPDATE transfer_requests SET status=$2, completed_at=NOW() WHERE id=$1 RETURNING *`;
      params = [id, status];
    } else {
      sql    = `UPDATE transfer_requests SET status=$2 WHERE id=$1 RETURNING *`;
      params = [id, status];
    }
    const { rows } = await query(sql, params);
    return rows[0] ?? null;
  },

  async countPending() {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM transfer_requests WHERE status = 'pending'`
    );
    return rows[0].count;
  },
};
