import BaseRepository from './BaseRepository.js';
import Player from '../models/Player.js';

class CustomerRepository extends BaseRepository {
  constructor() {
    super(Player, {
      tenantScoped: true,
      populateFields: [],
      softDeleteField: null
    });
  }

  /**
   * Search customers by phone (partial match)
   * @param {string} tenantId
   * @param {string} phone - Phone number to search
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async searchByPhone(tenantId, phone, options = {}) {
    const filter = {
      phone: { $regex: phone.replace(/[+\s-]/g, ''), $options: 'i' }
    };
    return this.findByTenant(tenantId, filter, { limit: options.limit || 10 });
  }

  /**
   * Search customers by name (partial match)
   * @param {string} tenantId
   * @param {string} name - Name to search
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async searchByName(tenantId, name, options = {}) {
    const filter = {
      $or: [
        { fullName: { $regex: name, $options: 'i' } },
        { nickname: { $regex: name, $options: 'i' } }
      ]
    };
    return this.findByTenant(tenantId, filter, { limit: options.limit || 10 });
  }

  /**
   * Search customers by any field
   * @param {string} tenantId
   * @param {string} query - Search query
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async search(tenantId, query, options = {}) {
    const searchRegex = { $regex: query, $options: 'i' };
    const filter = {
      $or: [
        { fullName: searchRegex },
        { nickname: searchRegex },
        { phone: searchRegex.replace(/[+\s-]/g, '') },
        { email: searchRegex }
      ]
    };
    return this.findByTenant(tenantId, filter, { limit: options.limit || 20 });
  }

  /**
   * Find customers with outstanding dues
   * @param {string} tenantId
   * @returns {Promise<Array>}
   */
  async findWithDues(tenantId) {
    return this.findByTenant(tenantId, { totalDue: { $gt: 0 } }, { sort: { totalDue: -1 } });
  }

  /**
   * Get top customers by booking count
   * @param {string} tenantId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async findTopByBookings(tenantId, limit = 10) {
    return this.findByTenant(tenantId, {}, { sort: { totalBookings: -1 }, limit });
  }
}

export default new CustomerRepository();
