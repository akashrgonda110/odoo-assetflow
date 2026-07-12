import { BookingModel }      from '../models/bookingModel.js';
import { AssetModel }        from '../models/assetModel.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { ApiError }          from '../utils/ApiError.js';
import { logActivity }       from '../utils/activityLogger.js';
import { NotificationModel } from '../models/notificationModel.js';

export const BookingController = {
  async getAll(req, res, next) {
    try {
      const { asset_id, booked_by, status, from_date, to_date, limit = 50, offset = 0 } = req.query;

      // Sync statuses before returning results
      await BookingModel.syncStatuses();

      const bookings = await BookingModel.findAll({
        asset_id, booked_by, status, from_date, to_date,
        limit: parseInt(limit, 10), offset: parseInt(offset, 10),
      });

      ApiResponse.success(res, 200, bookings);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) throw ApiError.notFound('Booking not found');
      ApiResponse.success(res, 200, booking);
    } catch (err) {
      next(err);
    }
  },

  /** GET /bookings/asset/:assetId/calendar — slots for calendar view */
  async getCalendar(req, res, next) {
    try {
      const asset = await AssetModel.findById(req.params.assetId);
      if (!asset) throw ApiError.notFound('Asset not found');

      const { from_date, to_date } = req.query;

      await BookingModel.syncStatuses();

      const bookings = await BookingModel.findAll({
        asset_id:  req.params.assetId,
        from_date: from_date ?? null,
        to_date:   to_date   ?? null,
        limit: 200, offset: 0,
      });

      ApiResponse.success(res, 200, {
        asset: { id: asset.id, asset_tag: asset.asset_tag, name: asset.name, location: asset.location },
        bookings,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { asset_id, dept_id, title, start_time, end_time, notes } = req.body;

      // 1. Asset must be bookable
      const asset = await AssetModel.findById(asset_id);
      if (!asset) throw ApiError.notFound('Asset not found');
      if (!asset.is_bookable) {
        throw ApiError.badRequest('This asset is not marked as bookable/shared');
      }

      // 2. Overlap check
      const overlap = await BookingModel.hasOverlap(asset_id, start_time, end_time);
      if (overlap) {
        throw ApiError.badRequest(
          'Booking conflict: the requested time slot overlaps with an existing booking'
        );
      }

      const booking = await BookingModel.create({
        asset_id,
        booked_by: req.user.sub,
        dept_id:   dept_id  ?? null,
        title:     title    ?? null,
        start_time, end_time,
        notes: notes ?? null,
      });

      await logActivity(req, {
        action:      'booking.created',
        entity_type: 'booking',
        entity_id:   booking.id,
        description: `Booking created for asset "${asset.name}" from ${start_time} to ${end_time}`,
        metadata:    { asset_id, start_time, end_time },
      });

      ApiResponse.success(res, 201, booking, 'Booking confirmed');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) throw ApiError.notFound('Booking not found');

      // Only the creator or admin/asset_manager can update
      if (booking.booked_by !== req.user.sub && !['admin', 'asset_manager'].includes(req.user.role)) {
        throw ApiError.forbidden('You can only update your own bookings');
      }

      if (booking.status === 'cancelled') {
        throw ApiError.badRequest('Cannot update a cancelled booking');
      }
      if (booking.status === 'completed') {
        throw ApiError.badRequest('Cannot update a completed booking');
      }

      const { start_time, end_time } = req.body;

      // Re-check overlap if times are changing
      if (start_time || end_time) {
        const newStart = start_time ?? booking.start_time;
        const newEnd   = end_time   ?? booking.end_time;
        const overlap  = await BookingModel.hasOverlap(booking.asset_id, newStart, newEnd, req.params.id);
        if (overlap) {
          throw ApiError.badRequest('Booking conflict: updated time slot overlaps with an existing booking');
        }
      }

      const updated = await BookingModel.update(req.params.id, req.body);

      await logActivity(req, {
        action:      'booking.updated',
        entity_type: 'booking',
        entity_id:   booking.id,
        description: `Booking #${booking.id} updated`,
      });

      ApiResponse.success(res, 200, updated, 'Booking updated');
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const { cancel_reason } = req.body;

      const booking = await BookingModel.findById(req.params.id);
      if (!booking) throw ApiError.notFound('Booking not found');

      if (booking.status === 'cancelled') throw ApiError.badRequest('Booking is already cancelled');
      if (booking.status === 'completed') throw ApiError.badRequest('Cannot cancel a completed booking');

      // Only creator, admin, or asset_manager can cancel
      if (booking.booked_by !== req.user.sub && !['admin', 'asset_manager'].includes(req.user.role)) {
        throw ApiError.forbidden('You can only cancel your own bookings');
      }

      const cancelled = await BookingModel.cancel(req.params.id, cancel_reason);

      // Notify booker if cancelled by someone else
      if (booking.booked_by !== req.user.sub) {
        await NotificationModel.create({
          user_id:     booking.booked_by,
          type:        'booking_cancelled',
          title:       'Booking Cancelled',
          message:     `Your booking for "${booking.asset_name}" has been cancelled. ${cancel_reason ?? ''}`.trim(),
          entity_type: 'booking',
          entity_id:   booking.id,
        });
      }

      await logActivity(req, {
        action:      'booking.cancelled',
        entity_type: 'booking',
        entity_id:   booking.id,
        description: `Booking for "${booking.asset_name}" cancelled`,
        metadata:    { cancel_reason },
      });

      ApiResponse.success(res, 200, cancelled, 'Booking cancelled');
    } catch (err) {
      next(err);
    }
  },
};
