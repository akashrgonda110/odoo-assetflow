import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.use('/auth',  authRoutes);
router.use('/users', userRoutes);

// Health check — no auth required
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

export default router;
