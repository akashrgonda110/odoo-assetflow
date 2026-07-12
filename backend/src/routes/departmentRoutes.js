import { Router } from 'express';
import { body, query } from 'express-validator';
import { DepartmentController } from '../controllers/departmentController.js';
import { authenticate }         from '../middleware/authenticate.js';
import { authorize }            from '../middleware/authorize.js';
import { validate }             from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  [query('status').optional().isIn(['active','inactive'])],
  validate,
  DepartmentController.getAll
);

router.get('/:id', DepartmentController.getOne);

router.post(
  '/',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('status').optional().isIn(['active','inactive']),
    body('head_id').optional().isUUID(),
    body('parent_id').optional().isUUID(),
  ],
  validate,
  DepartmentController.create
);

router.put(
  '/:id',
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('status').optional().isIn(['active','inactive']),
    body('head_id').optional().isUUID(),
    body('parent_id').optional().isUUID(),
  ],
  validate,
  DepartmentController.update
);

router.delete('/:id', authorize('admin'), DepartmentController.remove);

export default router;
