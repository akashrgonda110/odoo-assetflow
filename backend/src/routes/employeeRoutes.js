import { Router } from 'express';
import { body, query } from 'express-validator';
import { EmployeeController } from '../controllers/employeeController.js';
import { authenticate }       from '../middleware/authenticate.js';
import { authorize }          from '../middleware/authorize.js';
import { validate }           from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'asset_manager', 'department_head'),
  [
    query('role').optional().isIn(['admin','asset_manager','department_head','employee']),
    query('is_active').optional().isBoolean(),
  ],
  validate,
  EmployeeController.getAll
);

router.get('/:id', EmployeeController.getOne);

router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().isString(),
    body('department_id').optional().isUUID(),
    body('avatar_url').optional().isURL(),
  ],
  validate,
  EmployeeController.updateProfile
);

router.patch(
  '/:id/role',
  authorize('admin'),
  [
    body('role')
      .notEmpty()
      .isIn(['admin','asset_manager','department_head','employee'])
      .withMessage('Invalid role'),
  ],
  validate,
  EmployeeController.updateRole
);

router.patch(
  '/:id/status',
  authorize('admin'),
  [body('is_active').isBoolean().withMessage('is_active must be boolean')],
  validate,
  EmployeeController.toggleStatus
);

router.delete('/:id', authorize('admin'), EmployeeController.remove);

export default router;
