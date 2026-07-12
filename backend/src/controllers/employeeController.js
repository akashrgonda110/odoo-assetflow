import { UserModel }      from '../models/userModel.js';
import { ApiResponse }    from '../utils/ApiResponse.js';
import { ApiError }       from '../utils/ApiError.js';
import { logActivity }    from '../utils/activityLogger.js';
import { NotificationModel } from '../models/notificationModel.js';

const VALID_ROLES = ['admin', 'asset_manager', 'department_head', 'employee'];

export const EmployeeController = {
  /** GET /employees — paginated list with filters */
  async getAll(req, res, next) {
    try {
      const {
        role, department_id, is_active, search,
        limit = 50, offset = 0,
      } = req.query;

      const users = await UserModel.findAll({
        role,
        department_id,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        search,
        limit:  parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      const total = await UserModel.count({
        role,
        department_id,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
      });

      ApiResponse.success(res, 200, { users, total, limit: +limit, offset: +offset });
    } catch (err) {
      next(err);
    }
  },

  /** GET /employees/:id */
  async getOne(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) throw ApiError.notFound('Employee not found');
      ApiResponse.success(res, 200, user);
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /employees/:id — update own profile (name, phone, avatar) */
  async updateProfile(req, res, next) {
    try {
      const { id }    = req.params;
      const requester = req.user;

      // Non-admins can only edit their own profile
      if (requester.role !== 'admin' && requester.sub !== id) {
        throw ApiError.forbidden('You can only update your own profile');
      }

      const { name, phone, avatar_url, department_id } = req.body;
      const user = await UserModel.update(id, { name, phone, avatar_url, department_id });
      if (!user) throw ApiError.notFound('Employee not found');

      await logActivity(req, {
        action:      'employee.profile_updated',
        entity_type: 'user',
        entity_id:   id,
        description: `Employee "${user.name}" profile updated`,
      });

      ApiResponse.success(res, 200, user, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /employees/:id/role — Admin only: promote/demote role */
  async updateRole(req, res, next) {
    try {
      const { role } = req.body;

      if (!VALID_ROLES.includes(role)) {
        throw ApiError.badRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
      }

      const existing = await UserModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Employee not found');

      // Prevent demoting the last admin
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = await UserModel.count({ role: 'admin' });
        if (adminCount <= 1) {
          throw ApiError.badRequest('Cannot demote the last admin account');
        }
      }

      const user = await UserModel.updateRole(req.params.id, role);

      // Notify the employee
      await NotificationModel.create({
        user_id:     user.id,
        type:        'role_changed',
        title:       'Your role has been updated',
        message:     `Your account role has been changed to "${role}" by an administrator.`,
        entity_type: 'user',
        entity_id:   user.id,
      });

      await logActivity(req, {
        action:      'employee.role_changed',
        entity_type: 'user',
        entity_id:   user.id,
        description: `Employee "${user.name}" role changed from "${existing.role}" to "${role}"`,
        metadata:    { old_role: existing.role, new_role: role },
      });

      ApiResponse.success(res, 200, user, `Role updated to "${role}"`);
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /employees/:id/status — Admin only: activate/deactivate */
  async toggleStatus(req, res, next) {
    try {
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        throw ApiError.badRequest('is_active must be a boolean');
      }

      // Prevent deactivating self
      if (req.params.id === req.user.sub && !is_active) {
        throw ApiError.badRequest('You cannot deactivate your own account');
      }

      const existing = await UserModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Employee not found');

      const user = await UserModel.setActive(req.params.id, is_active);

      await NotificationModel.create({
        user_id:     user.id,
        type:        is_active ? 'account_activated' : 'account_deactivated',
        title:       is_active ? 'Account activated' : 'Account deactivated',
        message:     is_active
          ? 'Your account has been activated.'
          : 'Your account has been deactivated. Contact an administrator.',
        entity_type: 'user',
        entity_id:   user.id,
      });

      await logActivity(req, {
        action:      is_active ? 'employee.activated' : 'employee.deactivated',
        entity_type: 'user',
        entity_id:   user.id,
        description: `Employee "${user.name}" ${is_active ? 'activated' : 'deactivated'}`,
      });

      ApiResponse.success(res, 200, user, `Employee ${is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      next(err);
    }
  },

  /** DELETE /employees/:id — Admin only */
  async remove(req, res, next) {
    try {
      if (req.params.id === req.user.sub) {
        throw ApiError.badRequest('You cannot delete your own account');
      }

      const existing = await UserModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Employee not found');

      await UserModel.delete(req.params.id);

      await logActivity(req, {
        action:      'employee.deleted',
        entity_type: 'user',
        entity_id:   req.params.id,
        description: `Employee "${existing.name}" (${existing.email}) deleted`,
      });

      ApiResponse.success(res, 200, null, 'Employee deleted');
    } catch (err) {
      next(err);
    }
  },
};
