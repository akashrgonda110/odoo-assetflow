import { Router } from 'express';
import { body, query } from 'express-validator';
import { MaintenanceController } from '../controllers/maintenanceController.js';
import { authenticate }          from '../middleware/authenticate.js';
import { authorize }             from '../middleware/authorize.js';
import { validate }              from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  [
    query('status').optional().isIn(['pending','approved','rejected','technician_assigned','in_progress','resolved']),
    query('priority').optional().isIn(['low','medium','high','critical']),
  ],
  validate,
  MaintenanceController.getAll
);

router.get('/:id', MaintenanceController.getOne);

router.post(
  '/',
  [
    body('asset_id').isUUID().withMessage('Valid asset_id is required'),
    body('issue_desc').trim().notEmpty().withMessage('Issue description is required'),
    body('priority').optional().isIn(['low','medium','high','critical']),
    body('photo_url').optional().isURL(),
  ],
  validate,
  MaintenanceController.create
);

router.patch(
  '/:id/approve',
  authorize('admin', 'asset_manager'),
  MaintenanceController.approve
);

router.patch(
  '/:id/reject',
  authorize('admin', 'asset_manager'),
  [body('rejection_note').optional().isString()],
  validate,
  MaintenanceController.reject
);

router.patch(
  '/:id/assign',
  authorize('admin', 'asset_manager'),
  [body('assigned_to').isUUID().withMessage('Valid user ID required for technician')],
  validate,
  MaintenanceController.assignTechnician
);

router.patch(
  '/:id/start',
  authorize('admin', 'asset_manager'),
  MaintenanceController.startProgress
);

router.patch(
  '/:id/resolve',
  authorize('admin', 'asset_manager'),
  [body('resolution_note').optional().isString()],
  validate,
  MaintenanceController.resolve
);

export default router;
