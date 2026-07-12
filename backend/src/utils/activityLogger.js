import { ActivityLogModel } from '../models/activityLogModel.js';
import { logger } from './logger.js';

/**
 * Fire-and-forget activity log helper.
 * Never throws — log failures should never break the request.
 */
export const logActivity = async (req, { action, entity_type, entity_id, description, metadata } = {}) => {
  try {
    await ActivityLogModel.create({
      actor_id:    req.user?.sub   ?? null,
      actor_name:  req.user?.name  ?? null,
      action,
      entity_type: entity_type ?? null,
      entity_id:   entity_id   ?? null,
      description: description ?? null,
      metadata:    metadata    ?? {},
      ip_address:  req.ip      ?? null,
    });
  } catch (err) {
    logger.error('Failed to write activity log', { error: err.message });
  }
};
