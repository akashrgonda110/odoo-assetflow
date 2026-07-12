import { query } from '../config/db.js';

export const NotificationModel = {
  async findForUser(user_id, { is_read, type, limit = 30, offset = 0 } = {}) {
    const conds  = [`n.user_id = $1`];
    const params = [user_id];
    let idx = 2;

    if (is_read !== undefined) { conds.push(`n.is_read = $${idx++}`); params.push(is_read); }
    if (type)                  { conds.push(`n.type = $${idx++}`);    params.push(type); }

    params.push(limit, offset);

    const { rows } = await query(
      `SELECT * FROM notifications n
       WHERE ${conds.join(' AND ')}
       ORDER BY n.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    return rows;
  },

  async countUnread(user_id) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [user_id]
    );
    return rows[0].count;
  },

  async create({ user_id, type, title, message, entity_type, entity_id }) {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, type, title, message, entity_type ?? null, entity_id ?? null]
    );
    return rows[0];
  },

  /** Create the same notification for multiple users */
  async createBulk(userIds, { type, title, message, entity_type, entity_id }) {
    if (!userIds?.length) return;
    const values = userIds
      .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
      .join(', ');
    const params = userIds.flatMap(uid => [uid, type, title, message, entity_type ?? null, entity_id ?? null]);
    await query(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES ${values}`,
      params
    );
  },

  async markRead(id, user_id) {
    const { rows } = await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, user_id]
    );
    return rows[0] ?? null;
  },

  async markAllRead(user_id) {
    const { rowCount } = await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [user_id]
    );
    return rowCount;
  },

  async delete(id, user_id) {
    const { rowCount } = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    return rowCount > 0;
  },
};
