import { Router } from 'express';
import { body, query } from 'express-validator';
import { AuditController } from '../controllers/auditController.js';
import { authenticate }    from '../middleware/authenticate.js';
import { authorize }       from '../middleware/authorize.js';
import { validate }        from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'asset_manager', 'department_head'),
  [query('status').optional().isIn(['open','closed'])],
  validate,
  AuditController.getAll
);

router.get('/:id', AuditController.getOne);
router.get('/:id/discrepancies', AuditController.getDiscrepancyReport);

router.post(
  '/',
  authorize('admin', 'asset_manager'),
  [
    body('title').trim().notEmpty().withMessage('Audit title is required'),
    body('start_date').isISO8601().withMessage('Valid start_date required'),
    body('end_date')
      .isISO8601().withMessage('Valid end_date required')
      .custom((val, { req }) => {
        if (new Date(val) < new Date(req.body.start_date)) {
          throw new Error('end_date must be on or after start_date');
        }
        return true;
      }),
    body('scope_dept').optional().isUUID(),
    body('scope_location').optional().isString(),
    body('notes').optional().isString(),
  ],
  validate,
  AuditController.create
);

// ─── Auditors ────────────────────────────────────────────────────────────────

router.post(
  '/:id/auditors',
  authorize('admin', 'asset_manager'),
  [body('user_id').isUUID().withMessage('Valid user_id required')],
  validate,
  AuditController.addAuditor
);

router.delete(
  '/:id/auditors/:userId',
  authorize('admin', 'asset_manager'),
  AuditController.removeAuditor
);

// ─── Audit Items ─────────────────────────────────────────────────────────────

router.post(
  '/:id/items',
  authorize('admin', 'asset_manager'),
  [
    body('asset_id').isUUID().withMessage('Valid asset_id required'),
    body('expected_location').optional().isString(),
  ],
  validate,
  AuditController.addItem
);

router.patch(
  '/:id/items/:itemId/verify',
  [
    body('verification')
      .isIn(['verified','missing','damaged'])
      .withMessage('verification must be verified, missing, or damaged'),
    body('notes').optional().isString(),
  ],
  validate,
  AuditController.verifyItem
);

// ─── Close ───────────────────────────────────────────────────────────────────

router.post(
  '/:id/close',
  authorize('admin', 'asset_manager'),
  AuditController.closeCycle
);

export default router;
