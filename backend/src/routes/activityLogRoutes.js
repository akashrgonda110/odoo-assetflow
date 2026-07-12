import { Router } from 'express';
import { ActivityLogController } from '../controllers/notificationController.js';
import { authenticate }          from '../middleware/authenticate.js';
import { authorize }             from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'asset_manager'));

router.get('/',                         ActivityLogController.getAll);
router.get('/entity/:type/:id',         ActivityLogController.getForEntity);

export default router;
