// ============================================================
// EVENT BUS — Event-Driven Notification Engine
// ============================================================
// Singleton event emitter with subscriber registration and
// retry with exponential backoff for failed handlers.
// All async handlers are awaited before proceeding.

import EventEmitter from 'events';
import { logger } from '../config/logger.js';

class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
    this.handlers = new Map(); // eventType -> [{ handler, name, maxRetries }]
  }

  /**
   * Register a subscriber for an event type.
   * @param {string} eventType - Event type constant from eventTypes.js
   * @param {Function} handler - Async handler function(eventData, eventBus)
   * @param {object} options
   * @param {string} options.name - Handler name for logging (default: handler.name)
   * @param {number} options.maxRetries - Max retry attempts (default: 3)
   */
  subscribe(eventType, handler, options = {}) {
    const name = options.name || handler.name || 'anonymous';
    const maxRetries = options.maxRetries ?? 3;

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType).push({ handler, name, maxRetries });

    // Register on the emitter
    this.emitter.on(eventType, async (eventData) => {
      await this._executeHandler(eventType, handler, name, maxRetries, eventData);
    });

    logger.debug(`[EventBus] Subscriber '${name}' registered for event: ${eventType}`);
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} eventType
   * @param {object} data - Event payload
   */
  emit(eventType, data = {}) {
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.length === 0) {
      logger.debug(`[EventBus] Event '${eventType}' emitted — no subscribers`);
      return;
    }

    logger.debug(`[EventBus] Event '${eventType}' emitted — ${handlers.length} subscriber(s)`);
    this.emitter.emit(eventType, {
      eventType,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Execute a single handler with retry logic.
   */
  async _executeHandler(eventType, handler, name, maxRetries, eventData) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await handler(eventData, this);
        return; // Success
      } catch (error) {
        lastError = error;
        logger.warn(
          `[EventBus] Handler '${name}' failed for event '${eventType}' (attempt ${attempt}/${maxRetries}): ${error.message}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(
      `[EventBus] Handler '${name}' failed permanently for event '${eventType}' after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Remove all subscribers for an event type.
   */
  clearEvent(eventType) {
    this.emitter.removeAllListeners(eventType);
    this.handlers.delete(eventType);
  }

  /**
   * Remove all subscribers.
   */
  clearAll() {
    this.emitter.removeAllListeners();
    this.handlers.clear();
  }
}

// Singleton instance
const eventBus = new EventBus();
export default eventBus;
