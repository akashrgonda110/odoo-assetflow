import { Router } from 'express';
import { query }  from 'express-validator';
import { NotificationController, ActivityLogController } from '../controllers/notificationController.js';
import { authenticate }  from '../middleware/authenticate.js';
import { authorize }     from '../middleware/authorize.js';
import { validate }      from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ─── Notifications ────────────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('is_read').optional().isBoolean(),
    query('type').optional().isString(),
  ],
  validate,
  NotificationController.getAll
);

router.patch('/read-all',    NotificationController.markAllRead);
router.patch('/:id/read',    NotificationController.markRead);
router.delete('/:id',        NotificationController.remove);

export default router;
