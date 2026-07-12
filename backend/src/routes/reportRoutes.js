import { Router } from 'express';
import { query }  from 'express-validator';
import { ReportController } from '../controllers/reportController.js';
import { authenticate }     from '../middleware/authenticate.js';
import { authorize }        from '../middleware/authorize.js';
import { validate }         from '../middleware/validate.js';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'asset_manager', 'department_head'));

router.get('/utilization',            ReportController.assetUtilization);
router.get('/most-used',              ReportController.mostUsedAssets);
router.get(
  '/idle',
  [query('days').optional().isInt({ min: 1 })],
  validate,
  ReportController.idleAssets
);
router.get('/maintenance-frequency',  ReportController.maintenanceFrequency);
router.get('/due-attention',          ReportController.assetsDueForAttention);
router.get('/booking-heatmap',        ReportController.bookingHeatmap);
router.get('/dept-allocation',        ReportController.departmentAllocationSummary);
router.get('/export',                 ReportController.exportReport);

export default router;
