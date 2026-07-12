import { Router } from 'express';
import { body } from 'express-validator';
import { BookingController } from '../controllers/bookingController.js';
import { authenticate }      from '../middleware/authenticate.js';
import { authorize }         from '../middleware/authorize.js';
import { validate }          from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get('/', BookingController.getAll);
router.get('/asset/:assetId/calendar', BookingController.getCalendar);
router.get('/:id', BookingController.getOne);

router.post(
  '/',
  [
    body('asset_id').isUUID().withMessage('Valid asset_id is required'),
    body('start_time').isISO8601().withMessage('Valid start_time is required'),
    body('end_time')
      .isISO8601().withMessage('Valid end_time is required')
      .custom((val, { req }) => {
        if (new Date(val) <= new Date(req.body.start_time)) {
          throw new Error('end_time must be after start_time');
        }
        return true;
      }),
    body('title').optional().isString(),
    body('dept_id').optional().isUUID(),
    body('notes').optional().isString(),
  ],
  validate,
  BookingController.create
);

router.put(
  '/:id',
  [
    body('start_time').optional().isISO8601(),
    body('end_time').optional().isISO8601(),
    body('title').optional().isString(),
    body('notes').optional().isString(),
  ],
  validate,
  BookingController.update
);

router.patch(
  '/:id/cancel',
  [body('cancel_reason').optional().isString()],
  validate,
  BookingController.cancel
);

export default router;
