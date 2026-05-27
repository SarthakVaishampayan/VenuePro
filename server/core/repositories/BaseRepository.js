import mongoose from 'mongoose';

// ============================================================
// BASE REPOSITORY
// ============================================================
// Provides common CRUD operations with tenant isolation
// All queries automatically filter by tenantId

class BaseRepository {
  /**
   * @param {import('mongoose').Model} model - Mongoose model
   * @param {Object} options
   * @param {boolean} options.tenantScoped - Whether to enforce tenant isolation (default: true)
   * @param {string[]} options.populateFields - Fields to auto-populate
   * @param {string} options.softDeleteField - Field name for soft delete
   */
  constructor(model, options = {}) {
    this.model = model;
    this.tenantScoped = options.tenantScoped !== false;
    this.populateFields = options.populateFields || [];
    this.softDeleteField = options.softDeleteField || null;
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  /**
   * Build tenant filter if scoped
   * @param {string} tenantId
   * @param {Object} additionalFilter
   * @returns {Object}
   */
  _tenantFilter(tenantId, additionalFilter = {}) {
    if (!this.tenantScoped || !tenantId) return additionalFilter;
    return { ...additionalFilter, tenantId: new mongoose.Types.ObjectId(tenantId) };
  }

  /**
   * Build soft delete filter
   * @param {Object} filter
   * @returns {Object}
   */
  _softDeleteFilter(filter = {}) {
    if (this.softDeleteField) {
      return { ...filter, [this.softDeleteField]: { $ne: true } };
    }
    return filter;
  }

  /**
   * Apply populate fields
   * @param {import('mongoose').Query} query
   * @returns {import('mongoose').Query}
   */
  _applyPopulate(query) {
    if (this.populateFields.length > 0) {
      return query.populate(this.populateFields);
    }
    return query;
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * Find documents by tenant
   * @param {string} tenantId
   * @param {Object} filter - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByTenant(tenantId, filter = {}, options = {}) {
    const query = this.model.find(
      this._softDeleteFilter(this._tenantFilter(tenantId, filter))
    );

    if (options.sort) query.sort(options.sort);
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.select) query.select(options.select);

    return this._applyPopulate(query).exec();
  }

  /**
   * Find a single document by tenant
   * @param {string} tenantId
   * @param {Object} filter
   * @param {Object} options
   * @returns {Promise<Object|null>}
   */
  async findOneByTenant(tenantId, filter = {}, options = {}) {
    const query = this.model.findOne(
      this._softDeleteFilter(this._tenantFilter(tenantId, filter))
    );

    if (options.select) query.select(options.select);
    return this._applyPopulate(query).exec();
  }

  /**
   * Find by ID and tenant (prevents cross-tenant access)
   * @param {string} id
   * @param {string} tenantId
   * @param {Object} options
   * @returns {Promise<Object|null>}
   */
  async findByIdAndTenant(id, tenantId, options = {}) {
    const filter = { _id: id };
    if (this.tenantScoped && tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    const query = this.model.findOne(this._softDeleteFilter(filter));
    if (options.select) query.select(options.select);
    return this._applyPopulate(query).exec();
  }

  /**
   * Create a new document
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return this.model.create(data);
  }

  /**
   * Update by ID within tenant scope
   * @param {string} id
   * @param {string} tenantId
   * @param {Object} updateData
   * @param {Object} options
   * @returns {Promise<Object|null>}
   */
  async updateById(id, tenantId, updateData, options = {}) {
    const filter = { _id: id };
    if (this.tenantScoped && tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    const updateOptions = { new: true, runValidators: true, ...options };
    const query = this.model.findOneAndUpdate(filter, updateData, updateOptions);
    return this._applyPopulate(query).exec();
  }

  /**
   * Delete by ID within tenant scope (hard delete)
   * @param {string} id
   * @param {string} tenantId
   * @returns {Promise<Object|null>}
   */
  async deleteById(id, tenantId) {
    const filter = { _id: id };
    if (this.tenantScoped && tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }
    return this.model.findOneAndDelete(filter).exec();
  }

  /**
   * Soft delete by ID within tenant scope
   * @param {string} id
   * @param {string} tenantId
   * @returns {Promise<Object|null>}
   */
  async softDeleteById(id, tenantId) {
    if (!this.softDeleteField) {
      return this.deleteById(id, tenantId);
    }
    return this.updateById(id, tenantId, { [this.softDeleteField]: true });
  }

  /**
   * Count documents by tenant
   * @param {string} tenantId
   * @param {Object} filter
   * @returns {Promise<number>}
   */
  async countByTenant(tenantId, filter = {}) {
    return this.model.countDocuments(
      this._softDeleteFilter(this._tenantFilter(tenantId, filter))
    );
  }

  /**
   * Aggregate by tenant
   * @param {string} tenantId
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>}
   */
  async aggregateByTenant(tenantId, pipeline = []) {
    const tenantFilter = { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } };
    return this.model.aggregate([tenantFilter, ...pipeline]).exec();
  }

  /**
   * Paginated query
   * @param {string} tenantId
   * @param {Object} filter
   * @param {Object} options
   * @param {number} options.page
   * @param {number} options.limit
   * @param {string} options.sort
   * @returns {Promise<{data: Array, total: number, page: number, totalPages: number}>}
   */
  async paginate(tenantId, filter = {}, options = {}) {
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    const baseFilter = this._softDeleteFilter(this._tenantFilter(tenantId, filter));

    const [data, total] = await Promise.all([
      this._applyPopulate(
        this.model.find(baseFilter).sort(sort).skip(skip).limit(limit)
      ).exec(),
      this.model.countDocuments(baseFilter)
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find documents with filter regardless of tenant (platform-level queries)
   * @param {Object} filter
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async findAll(filter = {}, options = {}) {
    const query = this.model.find(this._softDeleteFilter(filter));
    if (options.sort) query.sort(options.sort);
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.select) query.select(options.select);
    return this._applyPopulate(query).exec();
  }
}

export default BaseRepository;
