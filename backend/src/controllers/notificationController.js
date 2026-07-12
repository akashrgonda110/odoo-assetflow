import { NotificationModel } from '../models/notificationModel.js';
import { ActivityLogModel }  from '../models/activityLogModel.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { ApiError }          from '../utils/ApiError.js';

export const NotificationController = {
  /** GET /notifications — current user's notifications */
  async getAll(req, res, next) {
    try {
      const { is_read, type, limit = 30, offset = 0 } = req.query;

      const [notifications, unread_count] = await Promise.all([
        NotificationModel.findForUser(req.user.sub, {
          is_read: is_read !== undefined ? is_read === 'true' : undefined,
          type,
          limit:  parseInt(limit, 10),
          offset: parseInt(offset, 10),
        }),
        NotificationModel.countUnread(req.user.sub),
      ]);

      ApiResponse.success(res, 200, { notifications, unread_count });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /notifications/:id/read */
  async markRead(req, res, next) {
    try {
      const notif = await NotificationModel.markRead(req.params.id, req.user.sub);
      if (!notif) throw ApiError.notFound('Notification not found');
      ApiResponse.success(res, 200, notif, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /notifications/read-all */
  async markAllRead(req, res, next) {
    try {
      const count = await NotificationModel.markAllRead(req.user.sub);
      ApiResponse.success(res, 200, { updated: count }, `${count} notification(s) marked as read`);
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /notifications/:id */
  async remove(req, res, next) {
    try {
      const deleted = await NotificationModel.delete(req.params.id, req.user.sub);
      if (!deleted) throw ApiError.notFound('Notification not found');
      ApiResponse.success(res, 200, null, 'Notification deleted');
    } catch (err) {
      next(err);
    }
  },
};

// ─── Activity Logs Controller ────────────────────────────────────────────────

export const ActivityLogController = {
  /** GET /activity-logs — Admin/Manager only */
  async getAll(req, res, next) {
    try {
      const { actor_id, entity_type, entity_id, action, limit = 50, offset = 0 } = req.query;

      const logs = await ActivityLogModel.findAll({
        actor_id, entity_type, entity_id, action,
        limit:  parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      ApiResponse.success(res, 200, logs, 'Activity logs');
    } catch (err) {
      next(err);
    }
  },

  /** GET /activity-logs/entity/:type/:id — all logs for a specific entity */
  async getForEntity(req, res, next) {
    try {
      const { type, id } = req.params;
      const logs = await ActivityLogModel.findAll({
        entity_type: type,
        entity_id:   id,
        limit: 100, offset: 0,
      });
      ApiResponse.success(res, 200, logs, `Activity logs for ${type} ${id}`);
    } catch (err) {
      next(err);
    }
  },
};
