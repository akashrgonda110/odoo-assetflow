import { AllocationModel }   from '../models/allocationModel.js';
import { TransferModel }     from '../models/transferModel.js';
import { AssetModel }        from '../models/assetModel.js';
import { UserModel }         from '../models/userModel.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { ApiError }          from '../utils/ApiError.js';
import { logActivity }       from '../utils/activityLogger.js';
import { NotificationModel } from '../models/notificationModel.js';

export const AllocationController = {
  /** GET /allocations */
  async getAll(req, res, next) {
    try {
      const { user_id, dept_id, is_active, overdue, limit = 50, offset = 0 } = req.query;

      const allocations = await AllocationModel.findAll({
        user_id,
        dept_id,
        is_active:  is_active !== undefined ? is_active === 'true' : undefined,
        overdue:    overdue === 'true',
        limit:  parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      ApiResponse.success(res, 200, allocations);
    } catch (err) {
      next(err);
    }
  },

  /** GET /allocations/:id */
  async getOne(req, res, next) {
    try {
      const allocation = await AllocationModel.findById(req.params.id);
      if (!allocation) throw ApiError.notFound('Allocation not found');
      ApiResponse.success(res, 200, allocation);
    } catch (err) {
      next(err);
    }
  },

  /** POST /allocations — Allocate an asset */
  async allocate(req, res, next) {
    try {
      const { asset_id, assigned_to_user, assigned_to_dept, expected_return_at } = req.body;

      if (!assigned_to_user && !assigned_to_dept) {
        throw ApiError.badRequest('Provide either assigned_to_user or assigned_to_dept');
      }

      // 1. Asset must exist and be available
      const asset = await AssetModel.findById(asset_id);
      if (!asset) throw ApiError.notFound('Asset not found');

      if (asset.status !== 'available') {
        // Find who holds it
        const current = await AllocationModel.findActiveByAsset(asset_id);
        return ApiResponse.success(res, 409, {
          conflict:          true,
          current_holder:    current?.assigned_to_name  ?? null,
          current_holder_id: current?.assigned_to_user  ?? null,
          current_dept:      current?.assigned_to_dept_name ?? null,
          asset_tag:         asset.asset_tag,
          asset_name:        asset.name,
          message:           `Asset is currently ${asset.status}. Submit a transfer request instead.`,
        }, 'Asset not available for direct allocation');
      }

      // 2. Validate recipient exists
      if (assigned_to_user) {
        const recipient = await UserModel.findById(assigned_to_user);
        if (!recipient) throw ApiError.notFound('Recipient employee not found');
        if (!recipient.is_active) throw ApiError.badRequest('Recipient account is inactive');
      }

      // 3. Create allocation + flip asset status
      const [allocation] = await Promise.all([
        AllocationModel.create({
          asset_id,
          assigned_to_user: assigned_to_user ?? null,
          assigned_to_dept: assigned_to_dept ?? null,
          allocated_by:     req.user.sub,
          expected_return_at: expected_return_at ?? null,
        }),
        AssetModel.updateStatus(asset_id, 'allocated'),
      ]);

      // 4. Notify recipient
      if (assigned_to_user) {
        await NotificationModel.create({
          user_id:     assigned_to_user,
          type:        'asset_assigned',
          title:       'Asset Assigned to You',
          message:     `Asset "${asset.name}" (${asset.asset_tag}) has been allocated to you.`,
          entity_type: 'allocation',
          entity_id:   allocation.id,
        });
      }

      await logActivity(req, {
        action:      'allocation.created',
        entity_type: 'allocation',
        entity_id:   allocation.id,
        description: `Asset "${asset.name}" (${asset.asset_tag}) allocated`,
        metadata:    { asset_id, assigned_to_user, assigned_to_dept },
      });

      ApiResponse.success(res, 201, allocation, 'Asset allocated successfully');
    } catch (err) {
      next(err);
    }
  },

  /** POST /allocations/:id/return — Return an asset */
  async returnAsset(req, res, next) {
    try {
      const { return_condition, return_notes } = req.body;

      const allocation = await AllocationModel.findById(req.params.id);
      if (!allocation) throw ApiError.notFound('Allocation not found');
      if (!allocation.is_active) throw ApiError.badRequest('This allocation is already closed');

      const [returned] = await Promise.all([
        AllocationModel.returnAsset(req.params.id, { return_condition, return_notes }),
        AssetModel.updateStatus(allocation.asset_id, 'available'),
      ]);

      await logActivity(req, {
        action:      'allocation.returned',
        entity_type: 'allocation',
        entity_id:   allocation.id,
        description: `Asset "${allocation.asset_name}" (${allocation.asset_tag}) returned`,
        metadata:    { return_condition, return_notes },
      });

      ApiResponse.success(res, 200, returned, 'Asset returned successfully');
    } catch (err) {
      next(err);
    }
  },

  // ─── Transfer Requests ────────────────────────────────────────────────────

  /** GET /allocations/transfers */
  async getTransfers(req, res, next) {
    try {
      const { asset_id, status, requested_by, limit = 50, offset = 0 } = req.query;
      const transfers = await TransferModel.findAll({
        asset_id, status, requested_by,
        limit: parseInt(limit, 10), offset: parseInt(offset, 10),
      });
      ApiResponse.success(res, 200, transfers);
    } catch (err) {
      next(err);
    }
  },

  /** GET /allocations/transfers/:id */
  async getTransferById(req, res, next) {
    try {
      const tr = await TransferModel.findById(req.params.id);
      if (!tr) throw ApiError.notFound('Transfer request not found');
      ApiResponse.success(res, 200, tr);
    } catch (err) {
      next(err);
    }
  },

  /** POST /allocations/transfers — Raise a transfer request */
  async requestTransfer(req, res, next) {
    try {
      const { asset_id, to_user_id, to_dept_id, reason } = req.body;

      const asset = await AssetModel.findById(asset_id);
      if (!asset) throw ApiError.notFound('Asset not found');

      if (!['allocated', 'available'].includes(asset.status)) {
        throw ApiError.badRequest(`Cannot transfer asset with status "${asset.status}"`);
      }

      const current = await AllocationModel.findActiveByAsset(asset_id);

      const transfer = await TransferModel.create({
        asset_id,
        from_user_id: current?.assigned_to_user ?? null,
        to_user_id:   to_user_id ?? null,
        to_dept_id:   to_dept_id ?? null,
        requested_by: req.user.sub,
        reason,
      });

      await logActivity(req, {
        action:      'transfer.requested',
        entity_type: 'transfer',
        entity_id:   transfer.id,
        description: `Transfer request for asset "${asset.name}" (${asset.asset_tag})`,
        metadata:    { asset_id, to_user_id, to_dept_id },
      });

      ApiResponse.success(res, 201, transfer, 'Transfer request submitted');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /allocations/transfers/:id/approve */
  async approveTransfer(req, res, next) {
    try {
      const tr = await TransferModel.findById(req.params.id);
      if (!tr) throw ApiError.notFound('Transfer request not found');
      if (tr.status !== 'pending') throw ApiError.badRequest('Only pending requests can be approved');

      const updated = await TransferModel.updateStatus(req.params.id, {
        status:      'approved',
        approved_by: req.user.sub,
      });

      // Carry out the transfer: close old allocation, open new one, flip status
      const asset = await AssetModel.findById(tr.asset_id);
      const currentAlloc = await AllocationModel.findActiveByAsset(tr.asset_id);

      if (currentAlloc) {
        await AllocationModel.returnAsset(currentAlloc.id, {
          return_notes: `Transferred — request #${tr.id}`,
        });
      }

      if (tr.to_user_id || tr.to_dept_id) {
        await AllocationModel.create({
          asset_id:         tr.asset_id,
          assigned_to_user: tr.to_user_id ?? null,
          assigned_to_dept: tr.to_dept_id ?? null,
          allocated_by:     req.user.sub,
        });
        await AssetModel.updateStatus(tr.asset_id, 'allocated');
      } else {
        await AssetModel.updateStatus(tr.asset_id, 'available');
      }

      await TransferModel.updateStatus(req.params.id, { status: 'completed' });

      // Notify requester
      await NotificationModel.create({
        user_id:     tr.requested_by,
        type:        'transfer_approved',
        title:       'Transfer Request Approved',
        message:     `Your transfer request for "${asset.name}" (${asset.asset_tag}) has been approved.`,
        entity_type: 'transfer',
        entity_id:   tr.id,
      });

      await logActivity(req, {
        action:      'transfer.approved',
        entity_type: 'transfer',
        entity_id:   tr.id,
        description: `Transfer request for asset "${asset.name}" approved and completed`,
      });

      ApiResponse.success(res, 200, updated, 'Transfer approved and completed');
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /allocations/transfers/:id/reject */
  async rejectTransfer(req, res, next) {
    try {
      const { rejection_note } = req.body;

      const tr = await TransferModel.findById(req.params.id);
      if (!tr) throw ApiError.notFound('Transfer request not found');
      if (tr.status !== 'pending') throw ApiError.badRequest('Only pending requests can be rejected');

      const updated = await TransferModel.updateStatus(req.params.id, {
        status:         'rejected',
        approved_by:    req.user.sub,
        rejection_note: rejection_note ?? null,
      });

      const asset = await AssetModel.findById(tr.asset_id);

      await NotificationModel.create({
        user_id:     tr.requested_by,
        type:        'transfer_rejected',
        title:       'Transfer Request Rejected',
        message:     `Your transfer request for "${asset.name}" was rejected. ${rejection_note ?? ''}`.trim(),
        entity_type: 'transfer',
        entity_id:   tr.id,
      });

      await logActivity(req, {
        action:      'transfer.rejected',
        entity_type: 'transfer',
        entity_id:   tr.id,
        description: `Transfer request for asset "${asset.name}" rejected`,
        metadata:    { rejection_note },
      });

      ApiResponse.success(res, 200, updated, 'Transfer request rejected');
    } catch (err) {
      next(err);
    }
  },
};
