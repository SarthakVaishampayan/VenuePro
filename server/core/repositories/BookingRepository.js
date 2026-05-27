import BaseRepository from './BaseRepository.js';
import Session from '../models/Session.js';
import Booking from '../models/Booking.js';

class BookingRepository extends BaseRepository {
  constructor() {
    // Use Session model for timer-based, Booking for slot-based
    super(Session, {
      tenantScoped: true,
      populateFields: ['resourceId', 'customerId'],
      softDeleteField: null
    });
  }

  /**
   * Find active bookings by tenant (in_progress or checked_in)
   * @param {string} tenantId
   * @returns {Promise<Array>}
   */
  async findActiveByTenant(tenantId) {
    return this.findByTenant(tenantId, {
      status: { $in: ['in_progress', 'checked_in'] }
    }, { sort: { startTime: -1 } });
  }

  /**
   * Find booking by resource and time range (for slot-based booking)
   * @param {string} tenantId
   * @param {string} resourceId
   * @param {Date} startTime
   * @param {Date} endTime
   * @returns {Promise<Array>}
   */
  async findByResourceAndTime(tenantId, resourceId, startTime, endTime) {
    return this.findByTenant(tenantId, {
      resourceId: resourceId,
      status: { $in: ['booked', 'checked_in', 'in_progress'] },
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });
  }

  /**
   * Get today's bookings count and revenue for a tenant
   * @param {string} tenantId
   * @returns {Promise<Object>}
   */
  async getTodayStats(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [active, completed, total] = await Promise.all([
      this.countByTenant(tenantId, {
        status: { $in: ['in_progress', 'checked_in'] }
      }),
      this.countByTenant(tenantId, {
        status: 'completed',
        endTime: { $gte: today }
      }),
      this.countByTenant(tenantId, {
        startTime: { $gte: today }
      })
    ]);

    return { active, completed, total };
  }

  /**
   * Get booking history for a specific customer
   * @param {string} tenantId
   * @param {string} customerId
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async findByCustomer(tenantId, customerId, options = {}) {
    return this.findByTenant(tenantId, {
      customerId: customerId
    }, {
      sort: { startTime: -1 },
      limit: options.limit || 50
    });
  }
}

// Export both a repository instance and also a slot-based booking repo
class SlotBookingRepository extends BaseRepository {
  constructor() {
    super(Booking, {
      tenantScoped: true,
      populateFields: ['resourceId', 'customerId'],
      softDeleteField: null
    });
  }

  async findActiveByTenant(tenantId) {
    return this.findByTenant(tenantId, {
      status: { $in: ['booked', 'checked_in', 'in_progress'] }
    }, { sort: { slotStart: 1 } });
  }

  async findByResourceAndTime(tenantId, resourceId, slotStart, slotEnd) {
    return this.findByTenant(tenantId, {
      resourceId,
      status: { $in: ['booked', 'checked_in', 'in_progress'] },
      $or: [
        { slotStart: { $lt: slotEnd, $gte: slotStart } },
        { slotEnd: { $gt: slotStart, $lte: slotEnd } }
      ]
    });
  }
}

export default new BookingRepository();
export { SlotBookingRepository };
