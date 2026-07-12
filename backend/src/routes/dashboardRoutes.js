import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { authenticate }        from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/kpis',               DashboardController.getKPIs);
router.get('/recent-activity',    DashboardController.getRecentActivity);
router.get('/overdue-allocations',DashboardController.getOverdueAllocations);

export default router;
