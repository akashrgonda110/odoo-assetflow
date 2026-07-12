import { DepartmentModel } from '../models/departmentModel.js';
import { ApiResponse }     from '../utils/ApiResponse.js';
import { ApiError }        from '../utils/ApiError.js';
import { logActivity }     from '../utils/activityLogger.js';

export const DepartmentController = {
  async getAll(req, res, next) {
    try {
      const { status } = req.query;
      const departments = await DepartmentModel.findAll({ status });
      ApiResponse.success(res, 200, departments, 'Departments retrieved');
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const dept = await DepartmentModel.findById(req.params.id);
      if (!dept) throw ApiError.notFound('Department not found');

      const employeeCount = await DepartmentModel.getEmployeeCount(dept.id);
      ApiResponse.success(res, 200, { ...dept, employee_count: employeeCount });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, head_id, parent_id, status } = req.body;

      const existing = await DepartmentModel.findByName(name);
      if (existing) throw ApiError.badRequest(`Department "${name}" already exists`);

      const dept = await DepartmentModel.create({ name, description, head_id, parent_id, status });

      await logActivity(req, {
        action:      'department.created',
        entity_type: 'department',
        entity_id:   dept.id,
        description: `Department "${dept.name}" created`,
      });

      ApiResponse.success(res, 201, dept, 'Department created');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const existing = await DepartmentModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Department not found');

      // Prevent circular parent
      if (req.body.parent_id === req.params.id) {
        throw ApiError.badRequest('A department cannot be its own parent');
      }

      const dept = await DepartmentModel.update(req.params.id, req.body);

      await logActivity(req, {
        action:      'department.updated',
        entity_type: 'department',
        entity_id:   dept.id,
        description: `Department "${dept.name}" updated`,
      });

      ApiResponse.success(res, 200, dept, 'Department updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const existing = await DepartmentModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Department not found');

      const count = await DepartmentModel.getEmployeeCount(req.params.id);
      if (count > 0) {
        throw ApiError.badRequest(
          `Cannot delete department with ${count} active employee(s). Reassign them first.`
        );
      }

      await DepartmentModel.delete(req.params.id);

      await logActivity(req, {
        action:      'department.deleted',
        entity_type: 'department',
        entity_id:   req.params.id,
        description: `Department "${existing.name}" deleted`,
      });

      ApiResponse.success(res, 200, null, 'Department deleted');
    } catch (err) {
      next(err);
    }
  },
};
