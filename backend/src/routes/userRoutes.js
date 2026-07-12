import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// All user routes require a valid access token
router.use(authenticate);

// Any authenticated user
router.get('/:id', UserController.getOne);

// Admin only
router.get('/',    authorize('admin'), UserController.getAll);
router.delete('/:id', authorize('admin'), UserController.remove);

// User can update their own profile; admin can update anyone
router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  ],
  validate,
  UserController.update
);

export default router;
