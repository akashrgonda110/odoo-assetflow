import { Router } from 'express';
import { body, query } from 'express-validator';
import { AllocationController } from '../controllers/allocationController.js';
import { authenticate }         from '../middleware/authenticate.js';
import { authorize }            from '../middleware/authorize.js';
import { validate }             from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ─── Allocations ─────────────────────────────────────────────────────────────

router.get(
  '/',
  authorize('admin', 'asset_manager', 'department_head'),
  AllocationController.getAll
);

router.get('/:id', AllocationController.getOne);

router.post(
  '/',
  authorize('admin', 'asset_manager'),
  [
    body('asset_id').isUUID().withMessage('Valid asset_id is required'),
    body('assigned_to_user').optional().isUUID(),
    body('assigned_to_dept').optional().isUUID(),
    body('expected_return_at').optional().isISO8601().toDate(),
  ],
  validate,
  AllocationController.allocate
);

router.post(
  '/:id/return',
  authorize('admin', 'asset_manager'),
  [
    body('return_condition')
      .optional()
      .isIn(['new','good','fair','poor','damaged']),
    body('return_notes').optional().isString(),
  ],
  validate,
  AllocationController.returnAsset
);

// ─── Transfer Requests ────────────────────────────────────────────────────────

router.get(
  '/transfers',
  authorize('admin', 'asset_manager', 'department_head'),
  AllocationController.getTransfers
);

router.get('/transfers/:id', AllocationController.getTransferById);

router.post(
  '/transfers',
  [
    body('asset_id').isUUID().withMessage('Valid asset_id is required'),
    body('to_user_id').optional().isUUID(),
    body('to_dept_id').optional().isUUID(),
    body('reason').optional().isString(),
  ],
  validate,
  AllocationController.requestTransfer
);

router.patch(
  '/transfers/:id/approve',
  authorize('admin', 'asset_manager', 'department_head'),
  AllocationController.approveTransfer
);

router.patch(
  '/transfers/:id/reject',
  authorize('admin', 'asset_manager', 'department_head'),
  [body('rejection_note').optional().isString()],
  validate,
  AllocationController.rejectTransfer
);

export default router;
