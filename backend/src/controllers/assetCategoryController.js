import { AssetCategoryModel } from '../models/assetCategoryModel.js';
import { ApiResponse }        from '../utils/ApiResponse.js';
import { ApiError }           from '../utils/ApiError.js';
import { logActivity }        from '../utils/activityLogger.js';

export const AssetCategoryController = {
  async getAll(req, res, next) {
    try {
      const categories = await AssetCategoryModel.findAll();
      ApiResponse.success(res, 200, categories, 'Categories retrieved');
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const cat = await AssetCategoryModel.findById(req.params.id);
      if (!cat) throw ApiError.notFound('Asset category not found');
      ApiResponse.success(res, 200, cat);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, custom_fields } = req.body;

      const existing = await AssetCategoryModel.findByName(name);
      if (existing) throw ApiError.badRequest(`Category "${name}" already exists`);

      const cat = await AssetCategoryModel.create({ name, description, custom_fields });

      await logActivity(req, {
        action:      'category.created',
        entity_type: 'asset_category',
        entity_id:   cat.id,
        description: `Asset category "${cat.name}" created`,
      });

      ApiResponse.success(res, 201, cat, 'Asset category created');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const existing = await AssetCategoryModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Asset category not found');

      const cat = await AssetCategoryModel.update(req.params.id, req.body);

      await logActivity(req, {
        action:      'category.updated',
        entity_type: 'asset_category',
        entity_id:   cat.id,
        description: `Asset category "${cat.name}" updated`,
      });

      ApiResponse.success(res, 200, cat, 'Asset category updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const existing = await AssetCategoryModel.findById(req.params.id);
      if (!existing) throw ApiError.notFound('Asset category not found');

      if (existing.asset_count > 0) {
        throw ApiError.badRequest(
          `Cannot delete category with ${existing.asset_count} asset(s). Reassign them first.`
        );
      }

      await AssetCategoryModel.delete(req.params.id);

      await logActivity(req, {
        action:      'category.deleted',
        entity_type: 'asset_category',
        entity_id:   req.params.id,
        description: `Asset category "${existing.name}" deleted`,
      });

      ApiResponse.success(res, 200, null, 'Asset category deleted');
    } catch (err) {
      next(err);
    }
  },
};
