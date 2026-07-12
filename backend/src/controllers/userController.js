import { UserModel } from '../models/userModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const UserController = {
  async getAll(req, res, next) {
    try {
      const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const offset = parseInt(req.query.offset, 10) || 0;
      const users  = await UserModel.findAll({ limit, offset });
      ApiResponse.success(res, 200, users);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) throw ApiError.notFound('User not found');
      ApiResponse.success(res, 200, user);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { name, email } = req.body;
      const user = await UserModel.update(req.params.id, { name, email });
      if (!user) throw ApiError.notFound('User not found');
      ApiResponse.success(res, 200, user, 'User updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await UserModel.delete(req.params.id);
      if (!deleted) throw ApiError.notFound('User not found');
      ApiResponse.success(res, 200, null, 'User deleted');
    } catch (err) {
      next(err);
    }
  },
};
