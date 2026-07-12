import { query } from '../config/db.js';

export const BookingModel = {
  /** Check if a booking would overlap with existing bookings for an asset */
  async hasOverlap(asset_id, start_time, end_time, excludeId = null) {
    const params = [asset_id, start_time, end_time];
    let excludeClause = '';
    if (excludeId) {
      params.push(excludeId);
      excludeClause = `AND id != $${params.length}`;
    }
    const { rows } = await query(
      `SELECT id FROM bookings
       WHERE asset_id = $1
         AND status NOT IN ('cancelled','completed')
         AND start_time < $3
         AND end_time   > $2
         ${excludeClause}
       LIMIT 1`,
      params
    );
    return rows.length > 0;
  },

  async findAll({ asset_id, booked_by, status, from_date, to_date, limit = 50, offset = 0 } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (asset_id)  { conds.push(`b.asset_id = $${idx++}`);  params.push(asset_id); }
    if (booked_by) { conds.push(`b.booked_by = $${idx++}`); params.push(booked_by); }
    if (status)    { conds.push(`b.status = $${idx++}`);    params.push(status); }
    if (from_date) { conds.push(`b.start_time >= $${idx++}`); params.push(from_date); }
    if (to_date)   { conds.push(`b.end_time <= $${idx++}`);   params.push(to_date); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT b.*,
              a.asset_tag, a.name AS asset_name, a.location AS asset_location,
              u.name  AS booked_by_name,
              u.email AS booked_by_email,
              d.name  AS dept_name
       FROM bookings b
       LEFT JOIN assets      a ON a.id = b.asset_id
       LEFT JOIN users       u ON u.id = b.booked_by
       LEFT JOIN departments d ON d.id = b.dept_id
       ${where}
       ORDER BY b.start_time ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT b.*,
              a.asset_tag, a.name AS asset_name,
              u.name  AS booked_by_name,
              u.email AS booked_by_email,
              d.name  AS dept_name
       FROM bookings b
       LEFT JOIN assets      a ON a.id = b.asset_id
       LEFT JOIN users       u ON u.id = b.booked_by
       LEFT JOIN departments d ON d.id = b.dept_id
       WHERE b.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create({ asset_id, booked_by, dept_id, title, start_time, end_time, notes }) {
    const { rows } = await query(
      `INSERT INTO bookings (asset_id, booked_by, dept_id, title, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        asset_id, booked_by,
        dept_id ?? null, title ?? null,
        start_time, end_time,
        notes ?? null,
      ]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['title','start_time','end_time','notes','status','cancel_reason'];
    const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
    if (!entries.length) return null;

    const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values     = [id, ...entries.map(([, v]) => v)];

    const { rows } = await query(
      `UPDATE bookings SET ${setClauses} WHERE id = $1 RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async cancel(id, cancel_reason) {
    const { rows } = await query(
      `UPDATE bookings SET status = 'cancelled', cancel_reason = $2 WHERE id = $1 RETURNING *`,
      [id, cancel_reason ?? null]
    );
    return rows[0] ?? null;
  },

  async countActive() {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM bookings
       WHERE status IN ('upcoming','ongoing')`
    );
    return rows[0].count;
  },

  /** Auto-update booking statuses based on current time */
  async syncStatuses() {
    await query(
      `UPDATE bookings
       SET status = 'ongoing'
       WHERE status = 'upcoming'
         AND start_time <= NOW()
         AND end_time > NOW()`
    );
    await query(
      `UPDATE bookings
       SET status = 'completed'
       WHERE status IN ('upcoming','ongoing')
         AND end_time <= NOW()`
    );
  },
};
