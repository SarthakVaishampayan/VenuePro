import mongoose from 'mongoose';
import BaseRepository from './BaseRepository.js';
import Payment from '../models/Payment.js';

class PaymentRepository extends BaseRepository {
  constructor() {
    super(Payment, {
      tenantScoped: true,
      populateFields: ['customerId', 'sessionId', 'recordedBy'],
      softDeleteField: null
    });
  }

  /**
   * Find payments within a date range
   * @param {string} tenantId
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async findByDateRange(tenantId, dateFrom, dateTo, options = {}) {
    const filter = {
      createdAt: {
        $gte: dateFrom,
        $lte: dateTo
      }
    };
    return this.findByTenant(tenantId, filter, {
      sort: { createdAt: -1 },
      ...options
    });
  }

  /**
   * Find payments by payment mode
   * @param {string} tenantId
   * @param {string} mode - cash / online / upi / card
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async findByMode(tenantId, mode, options = {}) {
    return this.findByTenant(tenantId, { mode }, {
      sort: { createdAt: -1 },
      ...options
    });
  }

  /**
   * Get daily payment summary for a tenant
   * @param {string} tenantId
   * @param {Date} date - Default: today
   * @returns {Promise<Object>}
   */
  async getDailySummary(tenantId, date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const payments = await this.findByTenant(tenantId, {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const summary = {
      totalAmount: 0,
      totalCount: payments.length,
      byMode: {}
    };

    for (const payment of payments) {
      summary.totalAmount += payment.amount;
      if (!summary.byMode[payment.mode]) {
        summary.byMode[payment.mode] = { count: 0, amount: 0 };
      }
      summary.byMode[payment.mode].count += 1;
      summary.byMode[payment.mode].amount += payment.amount;
    }

    return summary;
  }

  /**
   * Get revenue by mode for a period
   * @param {string} tenantId
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Promise<Array>}
   */
  async getRevenueByMode(tenantId, dateFrom, dateTo) {
    const pipeline = [
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: dateFrom, $lte: dateTo } } },
      { $group: { _id: '$mode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ];

    return this.aggregateByTenant(tenantId, pipeline);
  }

  /**
   * Get revenue trend (daily aggregates for a date range)
   * @param {string} tenantId
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Promise<Array>}
   */
  async getRevenueTrend(tenantId, dateFrom, dateTo) {
    const pipeline = [
      { $match: { createdAt: { $gte: dateFrom, $lte: dateTo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    return this.aggregateByTenant(tenantId, pipeline);
  }
}

export default new PaymentRepository();
