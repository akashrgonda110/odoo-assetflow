import { query }    from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const ReportController = {
  /** Asset utilization — allocated vs available per department */
  async assetUtilization(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT
           d.name                                        AS department_name,
           COUNT(a.id)::int                              AS total,
           COUNT(CASE WHEN a.status = 'allocated'  THEN 1 END)::int AS allocated,
           COUNT(CASE WHEN a.status = 'available'  THEN 1 END)::int AS available,
           COUNT(CASE WHEN a.status = 'under_maintenance' THEN 1 END)::int AS under_maintenance,
           ROUND(
             COUNT(CASE WHEN a.status = 'allocated' THEN 1 END)::numeric /
             NULLIF(COUNT(a.id), 0) * 100, 2
           ) AS utilization_pct
         FROM departments d
         LEFT JOIN assets a ON a.department_id = d.id
         WHERE d.status = 'active'
         GROUP BY d.id, d.name
         ORDER BY utilization_pct DESC NULLS LAST`
      );
      ApiResponse.success(res, 200, rows, 'Asset utilization by department');
    } catch (err) {
      next(err);
    }
  },

  /** Most used assets — by booking count this month */
  async mostUsedAssets(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT
           a.asset_tag,
           a.name AS asset_name,
           a.status,
           ac.name AS category,
           COUNT(b.id)::int AS usage_count,
           MAX(b.created_at) AS last_booked
         FROM assets a
         LEFT JOIN bookings          b  ON b.asset_id = a.id
                                       AND b.created_at >= date_trunc('month', NOW())
         LEFT JOIN asset_categories  ac ON ac.id = a.category_id
         GROUP BY a.id, a.asset_tag, a.name, a.status, ac.name
         ORDER BY usage_count DESC
         LIMIT 20`
      );
      ApiResponse.success(res, 200, rows, 'Most used assets');
    } catch (err) {
      next(err);
    }
  },

  /** Idle assets — not allocated or booked for N days */
  async idleAssets(req, res, next) {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const { rows } = await query(
        `SELECT
           a.asset_tag,
           a.name AS asset_name,
           a.status,
           a.location,
           ac.name AS category,
           d.name  AS department,
           MAX(al.returned_at)  AS last_returned,
           MAX(b.end_time)      AS last_booked_end,
           GREATEST(
             MAX(al.returned_at),
             MAX(b.end_time),
             a.created_at
           )::date AS last_activity,
           (CURRENT_DATE - GREATEST(
             MAX(al.returned_at),
             MAX(b.end_time),
             a.created_at
           )::date)::int AS idle_days
         FROM assets a
         LEFT JOIN asset_categories ac ON ac.id = a.category_id
         LEFT JOIN departments       d  ON d.id  = a.department_id
         LEFT JOIN allocations       al ON al.asset_id = a.id
         LEFT JOIN bookings          b  ON b.asset_id  = a.id
         WHERE a.status IN ('available','reserved')
         GROUP BY a.id, a.asset_tag, a.name, a.status, a.location,
                  ac.name, d.name, a.created_at
         HAVING GREATEST(
                  MAX(al.returned_at),
                  MAX(b.end_time),
                  a.created_at
                ) <= NOW() - ($1 * INTERVAL '1 day')
         ORDER BY last_activity ASC
         LIMIT 50`,
        [days]
      );
      ApiResponse.success(res, 200, rows, `Idle assets (not used in ${days}+ days)`);
    } catch (err) {
      next(err);
    }
  },

  /** Maintenance frequency — count by asset and category */
  async maintenanceFrequency(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT
           a.asset_tag,
           a.name AS asset_name,
           ac.name AS category,
           COUNT(mr.id)::int AS request_count,
           COUNT(CASE WHEN mr.status = 'resolved' THEN 1 END)::int AS resolved,
           COUNT(CASE WHEN mr.status IN ('pending','approved','in_progress') THEN 1 END)::int AS open,
           MAX(mr.created_at) AS last_request
         FROM assets a
         LEFT JOIN maintenance_requests mr ON mr.asset_id = a.id
         LEFT JOIN asset_categories     ac ON ac.id = a.category_id
         GROUP BY a.id, a.asset_tag, a.name, ac.name
         HAVING COUNT(mr.id) > 0
         ORDER BY request_count DESC
         LIMIT 30`
      );
      ApiResponse.success(res, 200, rows, 'Maintenance frequency by asset');
    } catch (err) {
      next(err);
    }
  },

  /** Assets due for maintenance or nearing retirement (4+ years old) */
  async assetsDueForAttention(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT
           a.asset_tag, a.name, a.status, a.condition,
           a.acquisition_date,
           ac.name AS category,
           d.name  AS department,
           DATE_PART('year', AGE(a.acquisition_date)) AS age_years,
           CASE
             WHEN a.condition IN ('poor','damaged')       THEN 'needs_maintenance'
             WHEN DATE_PART('year', AGE(a.acquisition_date)) >= 4 THEN 'nearing_retirement'
             ELSE 'ok'
           END AS attention_reason
         FROM assets a
         LEFT JOIN asset_categories ac ON ac.id = a.category_id
         LEFT JOIN departments       d  ON d.id  = a.department_id
         WHERE a.status NOT IN ('retired','disposed','lost')
           AND (
             a.condition IN ('poor','damaged')
             OR DATE_PART('year', AGE(a.acquisition_date)) >= 4
           )
         ORDER BY age_years DESC NULLS LAST`
      );
      ApiResponse.success(res, 200, rows, 'Assets needing attention');
    } catch (err) {
      next(err);
    }
  },

  /** Resource booking heatmap — bookings by hour of day and day of week */
  async bookingHeatmap(req, res, next) {
    try {
      const { asset_id } = req.query;
      const params       = [];
      let filter         = '';
      if (asset_id) {
        params.push(asset_id);
        filter = `AND asset_id = $1`;
      }

      const { rows } = await query(
        `SELECT
           EXTRACT(DOW  FROM start_time)::int AS day_of_week,
           EXTRACT(HOUR FROM start_time)::int AS hour_of_day,
           COUNT(*)::int AS booking_count
         FROM bookings
         WHERE status != 'cancelled'
           ${filter}
         GROUP BY day_of_week, hour_of_day
         ORDER BY day_of_week, hour_of_day`,
        params
      );

      ApiResponse.success(res, 200, rows, 'Booking heatmap');
    } catch (err) {
      next(err);
    }
  },

  /** Department-wise allocation summary */
  async departmentAllocationSummary(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT
           d.name                                              AS department_name,
           COUNT(al.id)::int                                   AS total_allocations,
           COUNT(CASE WHEN al.is_active = true THEN 1 END)::int AS allocated_count,
           COUNT(CASE WHEN al.is_active = false THEN 1 END)::int AS returned_allocations,
           COUNT(CASE WHEN al.is_active = true
                       AND al.expected_return_at < CURRENT_DATE THEN 1 END)::int AS overdue,
           COUNT(DISTINCT u.id)::int AS employee_count
         FROM departments d
         LEFT JOIN allocations al ON al.assigned_to_dept = d.id
         LEFT JOIN users       u  ON u.department_id = d.id AND u.is_active = true
         WHERE d.status = 'active'
         GROUP BY d.id, d.name
         ORDER BY allocated_count DESC`
      );
      ApiResponse.success(res, 200, rows, 'Department allocation summary');
    } catch (err) {
      next(err);
    }
  },

  /** Full report export — returns all KPI data in one payload */
  async exportReport(req, res, next) {
    try {
      const [util, maint, idle, dept, heatmap] = await Promise.all([
        query(
          `SELECT
             d.name AS department,
             COUNT(a.id)::int AS total_assets,
             COUNT(CASE WHEN a.status='allocated' THEN 1 END)::int AS allocated
           FROM departments d
           LEFT JOIN assets a ON a.department_id = d.id
           GROUP BY d.id, d.name`
        ),
        query(
          `SELECT a.asset_tag, a.name, COUNT(mr.id)::int AS maintenance_count
           FROM assets a
           LEFT JOIN maintenance_requests mr ON mr.asset_id = a.id
           GROUP BY a.id, a.asset_tag, a.name
           HAVING COUNT(mr.id) > 0
           ORDER BY maintenance_count DESC LIMIT 20`
        ),
        query(
          `SELECT a.asset_tag, a.name, a.status
           FROM assets a
           WHERE a.status = 'available'
             AND NOT EXISTS (
               SELECT 1 FROM allocations al
               WHERE al.asset_id = a.id AND al.is_active = true
             )
           ORDER BY a.asset_tag`
        ),
        query(
          `SELECT d.name AS department,
                  COUNT(CASE WHEN al.is_active=true THEN 1 END)::int AS active
           FROM departments d
           LEFT JOIN allocations al ON al.assigned_to_dept = d.id
           GROUP BY d.id, d.name`
        ),
        query(
          `SELECT EXTRACT(DOW FROM start_time)::int AS day,
                  EXTRACT(HOUR FROM start_time)::int AS hour,
                  COUNT(*)::int AS count
           FROM bookings WHERE status != 'cancelled'
           GROUP BY day, hour`
        ),
      ]);

      ApiResponse.success(res, 200, {
        generated_at:          new Date().toISOString(),
        utilization_by_dept:   util.rows,
        maintenance_frequency: maint.rows,
        idle_assets:           idle.rows,
        dept_allocation:       dept.rows,
        booking_heatmap:       heatmap.rows,
      }, 'Full report exported');
    } catch (err) {
      next(err);
    }
  },
};
