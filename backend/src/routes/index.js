import { Router } from 'express';

import authRoutes         from './authRoutes.js';
import employeeRoutes     from './employeeRoutes.js';
import departmentRoutes   from './departmentRoutes.js';
import categoryRoutes     from './assetCategoryRoutes.js';
import assetRoutes        from './assetRoutes.js';
import allocationRoutes   from './allocationRoutes.js';
import bookingRoutes      from './bookingRoutes.js';
import maintenanceRoutes  from './maintenanceRoutes.js';
import auditRoutes        from './auditRoutes.js';
import dashboardRoutes    from './dashboardRoutes.js';
import reportRoutes       from './reportRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import activityLogRoutes  from './activityLogRoutes.js';

const router = Router();

// ─── Health ──────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'AssetFlow API is healthy', timestamp: new Date().toISOString() });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.use('/auth',           authRoutes);

// ─── Organization Setup ───────────────────────────────────────────────────────
router.use('/employees',      employeeRoutes);
router.use('/departments',    departmentRoutes);
router.use('/categories',     categoryRoutes);

// ─── Asset Management ─────────────────────────────────────────────────────────
router.use('/assets',         assetRoutes);

// ─── Allocation & Transfer ────────────────────────────────────────────────────
router.use('/allocations',    allocationRoutes);

// ─── Resource Booking ─────────────────────────────────────────────────────────
router.use('/bookings',       bookingRoutes);

// ─── Maintenance ──────────────────────────────────────────────────────────────
router.use('/maintenance',    maintenanceRoutes);

// ─── Audit ────────────────────────────────────────────────────────────────────
router.use('/audits',         auditRoutes);

// ─── Dashboard & Reports ──────────────────────────────────────────────────────
router.use('/dashboard',      dashboardRoutes);
router.use('/reports',        reportRoutes);

// ─── Notifications & Logs ─────────────────────────────────────────────────────
router.use('/notifications',  notificationRoutes);
router.use('/activity-logs',  activityLogRoutes);

export default router;
