import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/\d/).withMessage('Must contain a number'),
  ],
  validate,
  AuthController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  AuthController.login
);

// Uses httpOnly cookie — no body needed
router.post('/refresh', AuthController.refresh);

// ── Protected ────────────────────────────────────────────────────────────────

router.get('/me',           authenticate, AuthController.me);
router.post('/logout',      authenticate, AuthController.logout);
router.post('/logout-all',  authenticate, AuthController.logoutAll);

export default router;
