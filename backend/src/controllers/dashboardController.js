import { query }             from '../config/db.js';
import { AssetModel }        from '../models/assetModel.js';
import { AllocationModel }   from '../models/allocationModel.js';
import { BookingModel }      from '../models/bookingModel.js';
import { MaintenanceModel }  from '../models/maintenanceModel.js';
import { TransferModel }     from '../models/transferModel.js';
import { ActivityLogModel }  from '../models/activityLogModel.js';
import { ApiResponse }       from '../utils/ApiResponse.js';

export const DashboardController = {
  async getKPIs(req, res, next) {
    try {
      // Sync booking statuses
      await BookingModel.syncStatuses();

      // Run all KPI queries in parallel
      const [
        assetsAvailable,
        assetsAllocated,
        assetsUnderMaintenance,
        activeBookings,
        pendingTransfers,
        overdueAllocations,
        upcomingReturns,
        maintenanceStatuses,
      ] = await Promise.all([
        AssetModel.count({ status: 'available' }),
        AssetModel.count({ status: 'allocated' }),
        AssetModel.count({ status: 'under_maintenance' }),
        BookingModel.countActive(),
        TransferModel.countPending(),
        AllocationModel.countOverdue(),
        AllocationModel.countUpcoming(7),
        MaintenanceModel.countByStatus(),
      ]);

      const maintenanceToday = await MaintenanceModel.countTodayResolved();

      const statusMap = maintenanceStatuses.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {});

      ApiResponse.success(res, 200, {
        assets: {
          available:        assetsAvailable,
          allocated:        assetsAllocated,
          under_maintenance: assetsUnderMaintenance,
        },
        bookings: {
          active: activeBookings,
        },
        transfers: {
          pending: pendingTransfers,
        },
        allocations: {
          overdue:          overdueAllocations,
          upcoming_returns: upcomingReturns,
        },
        maintenance: {
          pending:             statusMap.pending          ?? 0,
          approved:            statusMap.approved         ?? 0,
          in_progress:         statusMap.in_progress      ?? 0,
          resolved_today:      maintenanceToday,
        },
      }, 'Dashboard KPIs');
    } catch (err) {
      next(err);
    }
  },

  async getRecentActivity(req, res, next) {
    try {
      const limit   = parseInt(req.query.limit, 10) || 10;
      const recent  = await ActivityLogModel.findRecent(limit);
      ApiResponse.success(res, 200, recent, 'Recent activity');
    } catch (err) {
      next(err);
    }
  },

  async getOverdueAllocations(req, res, next) {
    try {
      const { rows } = await query(
        `SELECT al.*,
                a.asset_tag, a.name AS asset_name,
                u.name  AS assigned_to_name,
                u.email AS assigned_to_email,
                d.name  AS dept_name,
                (CURRENT_DATE - al.expected_return_at::date) AS days_overdue
         FROM allocations al
         LEFT JOIN assets      a ON a.id = al.asset_id
         LEFT JOIN users       u ON u.id = al.assigned_to_user
         LEFT JOIN departments d ON d.id = al.assigned_to_dept
         WHERE al.is_active = true
           AND al.expected_return_at IS NOT NULL
           AND al.expected_return_at < CURRENT_DATE
         ORDER BY al.expected_return_at ASC`
      );
      ApiResponse.success(res, 200, rows, 'Overdue allocations');
    } catch (err) {
      next(err);
    }
  },
};
