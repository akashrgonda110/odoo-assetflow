import { query } from '../config/db.js';

export const AuditModel = {
  async findAll({ status, limit = 50, offset = 0 } = {}) {
    const params = [];
    let where    = '';
    if (status) {
      params.push(status);
      where = `WHERE ac.status = $1`;
    }
    params.push(limit, offset);
    const limitIdx  = params.length - 1;
    const offsetIdx = params.length;

    const { rows } = await query(
      `SELECT ac.*,
              d.name  AS scope_dept_name,
              cb.name AS created_by_name,
              (SELECT COUNT(*)::int FROM audit_items ai WHERE ai.audit_id = ac.id) AS total_items,
              (SELECT COUNT(*)::int FROM audit_items ai WHERE ai.audit_id = ac.id AND ai.verification IS NOT NULL) AS verified_items
       FROM audit_cycles ac
       LEFT JOIN departments d  ON d.id  = ac.scope_dept
       LEFT JOIN users       cb ON cb.id = ac.created_by
       ${where}
       ORDER BY ac.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT ac.*,
              d.name  AS scope_dept_name,
              cb.name AS created_by_name
       FROM audit_cycles ac
       LEFT JOIN departments d  ON d.id  = ac.scope_dept
       LEFT JOIN users       cb ON cb.id = ac.created_by
       WHERE ac.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create({ title, scope_dept, scope_location, start_date, end_date, created_by, notes }) {
    const { rows } = await query(
      `INSERT INTO audit_cycles (title, scope_dept, scope_location, start_date, end_date, created_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        scope_dept     ?? null,
        scope_location ?? null,
        start_date, end_date,
        created_by ?? null,
        notes ?? null,
      ]
    );
    return rows[0];
  },

  async close(id) {
    const { rows } = await query(
      `UPDATE audit_cycles SET status = 'closed', closed_at = NOW()
       WHERE id = $1 AND status = 'open'
       RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },

  // ─── Auditors ──────────────────────────────────────────────────────────────

  async getAuditors(audit_id) {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role
       FROM audit_auditors aa
       JOIN users u ON u.id = aa.user_id
       WHERE aa.audit_id = $1`,
      [audit_id]
    );
    return rows;
  },

  async addAuditor(audit_id, user_id) {
    await query(
      `INSERT INTO audit_auditors (audit_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [audit_id, user_id]
    );
  },

  async removeAuditor(audit_id, user_id) {
    await query(
      `DELETE FROM audit_auditors WHERE audit_id = $1 AND user_id = $2`,
      [audit_id, user_id]
    );
  },

  // ─── Audit Items ───────────────────────────────────────────────────────────

  async getItems(audit_id) {
    const { rows } = await query(
      `SELECT ai.*,
              a.asset_tag, a.name AS asset_name, a.status AS asset_status,
              u.name AS verified_by_name
       FROM audit_items ai
       LEFT JOIN assets a ON a.id = ai.asset_id
       LEFT JOIN users  u ON u.id = ai.verified_by
       WHERE ai.audit_id = $1
       ORDER BY a.asset_tag ASC`,
      [audit_id]
    );
    return rows;
  },

  async addItem({ audit_id, asset_id, expected_location }) {
    const { rows } = await query(
      `INSERT INTO audit_items (audit_id, asset_id, expected_location)
       VALUES ($1, $2, $3)
       ON CONFLICT (audit_id, asset_id) DO NOTHING
       RETURNING *`,
      [audit_id, asset_id, expected_location ?? null]
    );
    return rows[0] ?? null;
  },

  async verifyItem(item_id, { verification, notes, verified_by }) {
    const { rows } = await query(
      `UPDATE audit_items
       SET verification = $2, notes = $3, verified_by = $4, verified_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [item_id, verification, notes ?? null, verified_by ?? null]
    );
    return rows[0] ?? null;
  },

  async getDiscrepancyReport(audit_id) {
    const { rows } = await query(
      `SELECT ai.*,
              a.asset_tag, a.name AS asset_name, a.location AS current_location,
              u.name AS verified_by_name
       FROM audit_items ai
       LEFT JOIN assets a ON a.id = ai.asset_id
       LEFT JOIN users  u ON u.id = ai.verified_by
       WHERE ai.audit_id = $1
         AND ai.verification IN ('missing','damaged')
       ORDER BY ai.verification, a.asset_tag`,
      [audit_id]
    );
    return rows;
  },
};
