import { query } from '../config/db.js';

export const AssetModel = {
  /** Generate next asset tag like AF-0001 */
  async nextTag() {
    const { rows } = await query(`SELECT nextval('asset_tag_seq') AS seq`);
    return `AF-${String(rows[0].seq).padStart(4, '0')}`;
  },

  async findAll({ status, category_id, department_id, search, is_bookable, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params     = [];
    let idx = 1;

    if (status) {
      conditions.push(`a.status = $${idx++}`);
      params.push(status);
    }
    if (category_id) {
      conditions.push(`a.category_id = $${idx++}`);
      params.push(category_id);
    }
    if (department_id) {
      conditions.push(`a.department_id = $${idx++}`);
      params.push(department_id);
    }
    if (is_bookable !== undefined) {
      conditions.push(`a.is_bookable = $${idx++}`);
      params.push(is_bookable);
    }
    if (search) {
      conditions.push(`(a.asset_tag ILIKE $${idx} OR a.name ILIKE $${idx} OR a.serial_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT a.*,
              ac.name AS category_name,
              d.name  AS department_name,
              u.name  AS created_by_name
       FROM assets a
       LEFT JOIN asset_categories ac ON ac.id = a.category_id
       LEFT JOIN departments       d  ON d.id  = a.department_id
       LEFT JOIN users             u  ON u.id  = a.created_by
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async count({ status, category_id, department_id, search } = {}) {
    const conditions = [];
    const params     = [];
    let idx = 1;

    if (status)        { conditions.push(`status = $${idx++}`);       params.push(status); }
    if (category_id)   { conditions.push(`category_id = $${idx++}`);  params.push(category_id); }
    if (department_id) { conditions.push(`department_id = $${idx++}`); params.push(department_id); }
    if (search) {
      conditions.push(`(asset_tag ILIKE $${idx} OR name ILIKE $${idx} OR serial_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT COUNT(*)::int AS total FROM assets ${where}`, params);
    return rows[0].total;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT a.*,
              ac.name  AS category_name,
              d.name   AS department_name,
              u.name   AS created_by_name
       FROM assets a
       LEFT JOIN asset_categories ac ON ac.id = a.category_id
       LEFT JOIN departments       d  ON d.id  = a.department_id
       LEFT JOIN users             u  ON u.id  = a.created_by
       WHERE a.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findByTag(asset_tag) {
    const { rows } = await query(
      `SELECT * FROM assets WHERE asset_tag = $1 LIMIT 1`,
      [asset_tag]
    );
    return rows[0] ?? null;
  },

  async create(data) {
    const {
      asset_tag, name, category_id, serial_number,
      acquisition_date, acquisition_cost, condition = 'good',
      location, department_id, is_bookable = false,
      photo_url, documents = [], custom_fields = {}, notes, created_by,
    } = data;

    const { rows } = await query(
      `INSERT INTO assets
         (asset_tag, name, category_id, serial_number, acquisition_date,
          acquisition_cost, condition, location, department_id, is_bookable,
          photo_url, documents, custom_fields, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        asset_tag, name, category_id, serial_number ?? null,
        acquisition_date ?? null, acquisition_cost ?? null, condition,
        location ?? null, department_id ?? null, is_bookable,
        photo_url ?? null, JSON.stringify(documents),
        JSON.stringify(custom_fields), notes ?? null, created_by ?? null,
      ]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = [
      'name','serial_number','acquisition_date','acquisition_cost','condition',
      'status','location','department_id','is_bookable','photo_url',
      'documents','custom_fields','notes','category_id',
    ];
    const entries = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
    if (!entries.length) return null;

    const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values     = [id, ...entries.map(([, v]) => v)];

    const { rows } = await query(
      `UPDATE assets SET ${setClauses} WHERE id = $1 RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async updateStatus(id, status) {
    const { rows } = await query(
      `UPDATE assets SET status = $2 WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return rows[0] ?? null;
  },

  async delete(id) {
    const { rowCount } = await query(`DELETE FROM assets WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  async getAllocationHistory(assetId) {
    const { rows } = await query(
      `SELECT al.*,
              u.name  AS assigned_to_user_name,
              d.name  AS assigned_to_dept_name,
              ab.name AS allocated_by_name
       FROM allocations al
       LEFT JOIN users       u  ON u.id  = al.assigned_to_user
       LEFT JOIN departments d  ON d.id  = al.assigned_to_dept
       LEFT JOIN users       ab ON ab.id = al.allocated_by
       WHERE al.asset_id = $1
       ORDER BY al.created_at DESC`,
      [assetId]
    );
    return rows;
  },

  async getMaintenanceHistory(assetId) {
    const { rows } = await query(
      `SELECT mr.*,
              u.name  AS raised_by_name,
              at_.name AS assigned_to_name,
              ap.name AS approved_by_name
       FROM maintenance_requests mr
       LEFT JOIN users u   ON u.id   = mr.raised_by
       LEFT JOIN users at_ ON at_.id = mr.assigned_to
       LEFT JOIN users ap  ON ap.id  = mr.approved_by
       WHERE mr.asset_id = $1
       ORDER BY mr.created_at DESC`,
      [assetId]
    );
    return rows;
  },
};
