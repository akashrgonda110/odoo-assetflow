import { MaintenanceModel }  from '../models/maintenanceModel.js';
import { AssetModel }        from '../models/assetModel.js';
import { UserModel }         from '../models/userModel.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { ApiError }          from '../utils/ApiError.js';
import { logActivity }       from '../utils/activityLogger.js';
import { NotificationModel } from '../models/notificationModel.js';

export const MaintenanceController = {
  async getAll(req, res, next) {
    try {
      const { asset_id, status, raised_by, priority, limit = 50, offset = 0 } = req.query;

      const requests = await MaintenanceModel.findAll({
        asset_id, status, raised_by, priority,
        limit: parseInt(limit, 10), offset: parseInt(offset, 10),
      });

      ApiResponse.success(res, 200, requests);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const mr = await MaintenanceModel.findById(req.params.id);
      if (!mr) throw ApiError.notFound('Maintenance request not found');
      ApiResponse.success(res, 200, mr);
    } catch (err) {
      next(err);
    }
  },

  /** POST /maintenance — Raise a maintenance request */
  async create(req, res, next) {
    try {
      const { asset_id, issue_desc, priority, photo_url } = req.body;

      const asset = await AssetModel.findById(asset_id);
      if (!asset) throw ApiError.notFound('Asset not found');

      if (asset.status === 'disposed' || asset.status === 'retired') {
        throw ApiError.badRequest(`Cannot raise maintenance for a ${asset.status} asset`);
      }

      const mr = await MaintenanceModel.create({
        asset_id,
        raised_by:  req.user.sub,
        issue_desc,
        priority,
        photo_url,
      });

      await logActivity(req, {
        action:      'maintenance.raised',
        entity_type: 'maintenance',
        entity_id:   mr.id,
        description: `Maintenance request raised for asset "${asset.name}" (${asset.asset_tag})`,
        metadata:    { priority, asset_id },
      });

      ApiResponse.success(res, 201, mr, 'Maintenance request raised');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /maintenance/:id/approve — Asset Manager approves */
  async approve(req, res, next) {
    try {
      const mr = await MaintenanceModel.findById(req.params.id);
      if (!mr) throw ApiError.notFound('Maintenance request not found');
      if (mr.status !== 'pending') {
        throw ApiError.badRequest(`Cannot approve a request with status "${mr.status}"`);
      }

      const approved = await MaintenanceModel.approve(req.params.id, req.user.sub);
      // Flip asset to under_maintenance
      await AssetModel.updateStatus(mr.asset_id, 'under_maintenance');

      await NotificationModel.create({
        user_id:     mr.raised_by,
        type:        'maintenance_approved',
        title:       'Maintenance Request Approved',
        message:     `Your maintenance request for "${mr.asset_name}" has been approved.`,
        entity_type: 'maintenance',
        entity_id:   mr.id,
      });

      await logActivity(req, {
        action:      'maintenance.approved',
        entity_type: 'maintenance',
        entity_id:   mr.id,
        description: `Maintenance request for "${mr.asset_name}" approved`,
      });

      ApiResponse.success(res, 200, approved, 'Maintenance request approved');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /maintenance/:id/reject — Asset Manager rejects */
  async reject(req, res, next) {
    try {
      const { rejection_note } = req.body;

      const mr = await MaintenanceModel.findById(req.params.id);
      if (!mr) throw ApiError.notFound('Maintenance request not found');
      if (mr.status !== 'pending') {
        throw ApiError.badRequest(`Cannot reject a request with status "${mr.status}"`);
      }

      const rejected = await MaintenanceModel.reject(req.params.id, req.user.sub, rejection_note);

      await NotificationModel.create({
        user_id:     mr.raised_by,
        type:        'maintenance_rejected',
        title:       'Maintenance Request Rejected',
        message:     `Your maintenance request for "${mr.asset_name}" was rejected. ${rejection_note ?? ''}`.trim(),
        entity_type: 'maintenance',
        entity_id:   mr.id,
      });

      await logActivity(req, {
        action:      'maintenance.rejected',
        entity_type: 'maintenance',
        entity_id:   mr.id,
        description: `Maintenance request for "${mr.asset_name}" rejected`,
        metadata:    { rejection_note },
      });

      ApiResponse.success(res, 200, rejected, 'Maintenance request rejected');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /maintenance/:id/assign — Assign a technician */
  async assignTechnician(req, res, next) {
    try {
      const { assigned_to } = req.body;

      const mr = await MaintenanceModel.findById(req.params.id);
      if (!mr) throw ApiError.notFound('Maintenance request not found');

      const technician = await UserModel.findById(assigned_to);
      if (!technician) throw ApiError.notFound('Technician not found');

      const updated = await MaintenanceModel.assignTechnician(req.params.id, assigned_to);
      if (!updated) {
        throw ApiError.badRequest(`Request must be in "approved" state to assign a technician`);
      }

      await NotificationModel.create({
        user_id:     assigned_to,
        type:        'maintenance_assigned',
        title:       'Maintenance Task Assigned',
        message:     `You have been assigned to fix "${mr.asset_name}" (${mr.asset_tag}).`,
        entity_type: 'maintenance',
        entity_id:   mr.id,
      });

      await logActivity(req, {
        action:      'maintenance.technician_assigned',
        entity_type: 'maintenance',
        entity_id:   mr.id,
        description: `Technician "${technician.name}" assigned to maintenance request`,
        metadata:    { assigned_to },
      });

      ApiResponse.success(res, 200, updated, 'Technician assigned');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /maintenance/:id/start — Mark in progress */
  async startProgress(req, res, next) {
    try {
      const mr = await MaintenanceModel.findById(req.params.id);
      if (!mr) throw ApiError.notFound('Maintenance request not found');

      const updated = await MaintenanceModel.startProgress(req.params.id);
      if (!updated) {
        throw ApiError.badRequest('A technician must be assigned before starting progress');
      }

      await logActivity(req, {
        action:      'maintenance.in_progress',
        entity_type: 'maintenance',
        entity_id:   mr.id,
        description: `Maintenance for "${mr.asset_name}" is now in progress`,
      });

      ApiResponse.success(res, 200, updated, 'Maintenance marked as in progress');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /maintenance/:id/resolve — Resolve and return asset to available */
  async resolve(req, res, next) {
    try {
      const { resolution_note } = req.body;

      const mr = await MaintenanceModel.findById(req.params.id);
      if (!mr) throw ApiError.notFound('Maintenance request not found');

      const resolved = await MaintenanceModel.resolve(req.params.id, resolution_note);
      if (!resolved) {
        throw ApiError.badRequest('Request must be "in_progress" to resolve');
      }

      // Return asset to available
      await AssetModel.updateStatus(mr.asset_id, 'available');

      await NotificationModel.create({
        user_id:     mr.raised_by,
        type:        'maintenance_resolved',
        title:       'Maintenance Resolved',
        message:     `Maintenance for "${mr.asset_name}" has been resolved. ${resolution_note ?? ''}`.trim(),
        entity_type: 'maintenance',
        entity_id:   mr.id,
      });

      await logActivity(req, {
        action:      'maintenance.resolved',
        entity_type: 'maintenance',
        entity_id:   mr.id,
        description: `Maintenance for "${mr.asset_name}" resolved. Asset returned to available.`,
        metadata:    { resolution_note },
      });

      ApiResponse.success(res, 200, resolved, 'Maintenance resolved. Asset is now available.');
    } catch (err) {
      next(err);
    }
  },
};
