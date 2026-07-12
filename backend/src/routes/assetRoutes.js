import { Router } from 'express';
import { body, query } from 'express-validator';
import { AssetController } from '../controllers/assetController.js';
import { authenticate }    from '../middleware/authenticate.js';
import { authorize }       from '../middleware/authorize.js';
import { validate }        from '../middleware/validate.js';

const VALID_STATUSES     = ['available','allocated','reserved','under_maintenance','lost','retired','disposed'];
const VALID_CONDITIONS   = ['new','good','fair','poor','damaged'];

const router = Router();
router.use(authenticate);

router.get(
  '/',
  [
    query('status').optional().isIn(VALID_STATUSES),
    query('is_bookable').optional().isBoolean(),
  ],
  validate,
  AssetController.getAll
);

router.get('/:id', AssetController.getOne);
router.get('/:id/history', AssetController.getHistory);

router.post(
  '/',
  authorize('admin', 'asset_manager'),
  [
    body('name').trim().notEmpty().withMessage('Asset name is required'),
    body('category_id').isUUID().withMessage('Valid category_id is required'),
    body('condition').optional().isIn(VALID_CONDITIONS),
    body('acquisition_cost').optional().isNumeric(),
    body('is_bookable').optional().isBoolean(),
  ],
  validate,
  AssetController.create
);

router.put(
  '/:id',
  authorize('admin', 'asset_manager'),
  [
    body('name').optional().trim().notEmpty(),
    body('condition').optional().isIn(VALID_CONDITIONS),
    body('is_bookable').optional().isBoolean(),
  ],
  validate,
  AssetController.update
);

router.patch(
  '/:id/status',
  authorize('admin', 'asset_manager'),
  [
    body('status')
      .isIn(['available','reserved','lost','retired','disposed'])
      .withMessage('Invalid direct status transition'),
  ],
  validate,
  AssetController.updateStatus
);

router.delete('/:id', authorize('admin', 'asset_manager'), AssetController.remove);

export default router;
