import { AuditModel }        from '../models/auditModel.js';
import { AssetModel }        from '../models/assetModel.js';
import { UserModel }         from '../models/userModel.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { ApiError }          from '../utils/ApiError.js';
import { logActivity }       from '../utils/activityLogger.js';
import { NotificationModel } from '../models/notificationModel.js';

export const AuditController = {
  async getAll(req, res, next) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      const cycles = await AuditModel.findAll({
        status,
        limit: parseInt(limit, 10), offset: parseInt(offset, 10),
      });
      ApiResponse.success(res, 200, cycles);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const cycle = await AuditModel.findById(req.params.id);
      if (!cycle) throw ApiError.notFound('Audit cycle not found');

      const [auditors, items] = await Promise.all([
        AuditModel.getAuditors(req.params.id),
        AuditModel.getItems(req.params.id),
      ]);

      ApiResponse.success(res, 200, { ...cycle, auditors, items });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { title, scope_dept, scope_location, start_date, end_date, notes } = req.body;

      const cycle = await AuditModel.create({
        title, scope_dept, scope_location,
        start_date, end_date, notes,
        created_by: req.user.sub,
      });

      await logActivity(req, {
        action:      'audit.created',
        entity_type: 'audit_cycle',
        entity_id:   cycle.id,
        description: `Audit cycle "${cycle.title}" created`,
        metadata:    { scope_dept, start_date, end_date },
      });

      ApiResponse.success(res, 201, cycle, 'Audit cycle created');
    } catch (err) {
      next(err);
    }
  },

  // ─── Auditors ─────────────────────────────────────────────────────────────

  async addAuditor(req, res, next) {
    try {
      const { user_id } = req.body;

      const [cycle, user] = await Promise.all([
        AuditModel.findById(req.params.id),
        UserModel.findById(user_id),
      ]);

      if (!cycle) throw ApiError.notFound('Audit cycle not found');
      if (!user)  throw ApiError.notFound('User not found');
      if (cycle.status === 'closed') throw ApiError.badRequest('Cannot modify a closed audit cycle');

      await AuditModel.addAuditor(req.params.id, user_id);

      await NotificationModel.create({
        user_id,
        type:        'audit_assigned',
        title:       'Audit Cycle Assignment',
        message:     `You have been assigned as an auditor for "${cycle.title}".`,
        entity_type: 'audit_cycle',
        entity_id:   cycle.id,
      });

      const auditors = await AuditModel.getAuditors(req.params.id);
      ApiResponse.success(res, 200, auditors, 'Auditor added');
    } catch (err) {
      next(err);
    }
  },

  async removeAuditor(req, res, next) {
    try {
      const cycle = await AuditModel.findById(req.params.id);
      if (!cycle) throw ApiError.notFound('Audit cycle not found');
      if (cycle.status === 'closed') throw ApiError.badRequest('Cannot modify a closed audit cycle');

      await AuditModel.removeAuditor(req.params.id, req.params.userId);
      const auditors = await AuditModel.getAuditors(req.params.id);
      ApiResponse.success(res, 200, auditors, 'Auditor removed');
    } catch (err) {
      next(err);
    }
  },

  // ─── Audit Items ──────────────────────────────────────────────────────────

  async addItem(req, res, next) {
    try {
      const { asset_id, expected_location } = req.body;

      const [cycle, asset] = await Promise.all([
        AuditModel.findById(req.params.id),
        AssetModel.findById(asset_id),
      ]);

      if (!cycle) throw ApiError.notFound('Audit cycle not found');
      if (!asset) throw ApiError.notFound('Asset not found');
      if (cycle.status === 'closed') throw ApiError.badRequest('Cannot modify a closed audit cycle');

      const item = await AuditModel.addItem({
        audit_id:          req.params.id,
        asset_id,
        expected_location: expected_location ?? asset.location,
      });

      ApiResponse.success(res, 201, item, 'Asset added to audit');
    } catch (err) {
      next(err);
    }
  },

  async verifyItem(req, res, next) {
    try {
      const { verification, notes } = req.body;

      const VALID = ['verified', 'missing', 'damaged'];
      if (!VALID.includes(verification)) {
        throw ApiError.badRequest(`verification must be one of: ${VALID.join(', ')}`);
      }

      const cycle = await AuditModel.findById(req.params.id);
      if (!cycle) throw ApiError.notFound('Audit cycle not found');
      if (cycle.status === 'closed') throw ApiError.badRequest('Cannot update a closed audit cycle');

      const item = await AuditModel.verifyItem(req.params.itemId, {
        verification,
        notes,
        verified_by: req.user.sub,
      });

      if (!item) throw ApiError.notFound('Audit item not found');

      await logActivity(req, {
        action:      'audit.item_verified',
        entity_type: 'audit_item',
        entity_id:   item.id,
        description: `Audit item verified as "${verification}"`,
        metadata:    { verification, notes },
      });

      ApiResponse.success(res, 200, item, 'Verification recorded');
    } catch (err) {
      next(err);
    }
  },

  async getDiscrepancyReport(req, res, next) {
    try {
      const cycle = await AuditModel.findById(req.params.id);
      if (!cycle) throw ApiError.notFound('Audit cycle not found');

      const discrepancies = await AuditModel.getDiscrepancyReport(req.params.id);

      ApiResponse.success(res, 200, {
        cycle,
        discrepancy_count: discrepancies.length,
        discrepancies,
      });
    } catch (err) {
      next(err);
    }
  },

  /** POST /audits/:id/close — Close cycle and update affected asset statuses */
  async closeCycle(req, res, next) {
    try {
      const cycle = await AuditModel.findById(req.params.id);
      if (!cycle) throw ApiError.notFound('Audit cycle not found');
      if (cycle.status === 'closed') throw ApiError.badRequest('Audit cycle is already closed');

      const discrepancies = await AuditModel.getDiscrepancyReport(req.params.id);

      // Update asset statuses based on discrepancies
      for (const item of discrepancies) {
        if (item.verification === 'missing') {
          await AssetModel.updateStatus(item.asset_id, 'lost');
        } else if (item.verification === 'damaged') {
          // Mark condition but keep current status (available / allocated)
          await AssetModel.update(item.asset_id, { condition: 'damaged' });
        }
      }

      const closed = await AuditModel.close(req.params.id);

      await logActivity(req, {
        action:      'audit.closed',
        entity_type: 'audit_cycle',
        entity_id:   cycle.id,
        description: `Audit cycle "${cycle.title}" closed. ${discrepancies.length} discrepancies found.`,
        metadata:    { discrepancy_count: discrepancies.length },
      });

      ApiResponse.success(res, 200, {
        cycle:             closed,
        discrepancy_count: discrepancies.length,
        discrepancies,
      }, `Audit cycle closed. ${discrepancies.length} discrepancy/discrepancies processed.`);
    } catch (err) {
      next(err);
    }
  },
};
