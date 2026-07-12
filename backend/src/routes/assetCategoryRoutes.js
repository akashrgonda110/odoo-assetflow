import { Router } from 'express';
import { body } from 'express-validator';
import { AssetCategoryController } from '../controllers/assetCategoryController.js';
import { authenticate }            from '../middleware/authenticate.js';
import { authorize }               from '../middleware/authorize.js';
import { validate }                from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get('/', AssetCategoryController.getAll);
router.get('/:id', AssetCategoryController.getOne);

router.post(
  '/',
  authorize('admin', 'asset_manager'),
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('description').optional().isString(),
    body('custom_fields').optional().isArray(),
  ],
  validate,
  AssetCategoryController.create
);

router.put(
  '/:id',
  authorize('admin', 'asset_manager'),
  [
    body('name').optional().trim().notEmpty(),
    body('custom_fields').optional().isArray(),
  ],
  validate,
  AssetCategoryController.update
);

router.delete(
  '/:id',
  authorize('admin'),
  AssetCategoryController.remove
);

export default router;
