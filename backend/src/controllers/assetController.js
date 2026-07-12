import { AssetModel }    from '../models/assetModel.js';
import { ApiResponse }   from '../utils/ApiResponse.js';
import { ApiError }      from '../utils/ApiError.js';
import { logActivity }   from '../utils/activityLogger.js';

export const AssetController = {
  async getAll(req, res, next) {
    try {
      const {
        status, category_id, department_id, search,
        is_bookable, limit = 50, offset = 0,
      } = req.query;

      const [assets, total] = await Promise.all([
        AssetModel.findAll({
          status, category_id, department_id, search,
          is_bookable: is_bookable !== undefined ? is_bookable === 'true' : undefined,
          limit:  parseInt(limit, 10),
          offset: parseInt(offset, 10),
        }),
        AssetModel.count({ status, category_id, department_id, search }),
      ]);

      ApiResponse.success(res, 200, { assets, total, limit: +limit, offset: +offset });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const asset = await AssetModel.findById(req.params.id);
      if (!asset) throw ApiError.notFound('Asset not found');
      ApiResponse.success(res, 200, asset);
    } catch (err) {
      next(err);
    }
  },

  async getHistory(req, res, next) {
    try {
      const asset = await AssetModel.findById(req.params.id);
      if (!asset) throw ApiError.notFound('Asset not found');

      const [allocationHistory, maintenanceHistory] = await Promise.all([
        AssetModel.getAllocationHistory(req.params.id),
        AssetModel.getMaintenanceHistory(req.params.id),
      ]);

      ApiResponse.success(res, 200, {
        asset: { id: asset.id, asset_tag: asset.asset_tag, name: asset.name },
        allocation_history:   allocationHistory,
        maintenance_history:  maintenanceHistory,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const asset_tag = await AssetModel.nextTag();

      const asset = await AssetModel.create({
        ...req.body,
        asset_tag,
        created_by: req.user.sub,
      });

      await logActivity(req, {
        action:      'asset.registered',
        entity_type: 'asset',
        entity_id:   asset.id,
        description: `Asset "${asset.name}" (${asset.asset_tag}) registered`,
      });

      ApiResponse.success(res, 201, asset, 'Asset registered successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const existing = await AssetModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Asset not found');

      // Don't allow direct status change via this endpoint
      const { status: _ignored, ...updateFields } = req.body;

      const asset = await AssetModel.update(req.params.id, updateFields);

      await logActivity(req, {
        action:      'asset.updated',
        entity_type: 'asset',
        entity_id:   asset.id,
        description: `Asset "${asset.name}" (${asset.asset_tag}) updated`,
      });

      ApiResponse.success(res, 200, asset, 'Asset updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const existing = await AssetModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Asset not found');

      // Cannot delete allocated/under-maintenance assets
      if (['allocated', 'under_maintenance'].includes(existing.status)) {
        throw ApiError.badRequest(
          `Cannot delete an asset with status "${existing.status}". Return or resolve it first.`
        );
      }

      await AssetModel.delete(req.params.id);

      await logActivity(req, {
        action:      'asset.deleted',
        entity_type: 'asset',
        entity_id:   req.params.id,
        description: `Asset "${existing.name}" (${existing.asset_tag}) deleted`,
      });

      ApiResponse.success(res, 200, null, 'Asset deleted');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /assets/:id/status — change lifecycle status directly (retire, dispose, mark lost) */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const ALLOWED = ['available', 'reserved', 'lost', 'retired', 'disposed'];

      if (!ALLOWED.includes(status)) {
        throw ApiError.badRequest(
          `Direct status change only allowed to: ${ALLOWED.join(', ')}`
        );
      }

      const existing = await AssetModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Asset not found');

      if (existing.status === 'allocated' && status !== 'available') {
        throw ApiError.badRequest('Return the asset before changing its status');
      }

      const asset = await AssetModel.updateStatus(req.params.id, status);

      await logActivity(req, {
        action:      'asset.status_changed',
        entity_type: 'asset',
        entity_id:   asset.id,
        description: `Asset "${asset.name}" status changed from "${existing.status}" to "${status}"`,
        metadata:    { old_status: existing.status, new_status: status },
      });

      ApiResponse.success(res, 200, asset, `Asset status updated to "${status}"`);
    } catch (err) {
      next(err);
    }
  },
};
