import { query } from '../config/db.js';

export const ActivityLogModel = {
  async create({ actor_id, actor_name, action, entity_type, entity_id, description, metadata, ip_address }) {
    const { rows } = await query(
      `INSERT INTO activity_logs
         (actor_id, actor_name, action, entity_type, entity_id, description, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        actor_id    ?? null,
        actor_name  ?? null,
        action,
        entity_type ?? null,
        entity_id   ?? null,
        description ?? null,
        JSON.stringify(metadata ?? {}),
        ip_address  ?? null,
      ]
    );
    return rows[0];
  },

  async findAll({ actor_id, entity_type, entity_id, action, limit = 50, offset = 0 } = {}) {
    const conds  = [];
    const params = [];
    let idx = 1;

    if (actor_id)    { conds.push(`al.actor_id = $${idx++}`);    params.push(actor_id); }
    if (entity_type) { conds.push(`al.entity_type = $${idx++}`); params.push(entity_type); }
    if (entity_id)   { conds.push(`al.entity_id = $${idx++}`);   params.push(entity_id); }
    if (action)      { conds.push(`al.action ILIKE $${idx++}`);  params.push(`%${action}%`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await query(
      `SELECT al.*
       FROM activity_logs al
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async findRecent(limit = 10) {
    const { rows } = await query(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },
};
