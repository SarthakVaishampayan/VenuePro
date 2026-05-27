// ============================================================
// WATERMARK SERVICE — Free Plan Branding
// ============================================================
// Adds "Powered by VenuePro" watermarks to receipts, booking pages
// and other customer-facing outputs for free plan tenants.

const WATERMARK_TEXT = 'Powered by VenuePro';
const WATERMARK_HTML = `
  <div class="watermark-venuepro" style="
    text-align: center;
    padding: 8px 12px;
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
    letter-spacing: 0.5px;
  ">
    <span style="display: inline-flex; align-items: center; gap: 4px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      ${WATERMARK_TEXT}
    </span>
  </div>
`;

/**
 * Check if a tenant's plan requires watermarking
 * @param {Object} subscription - The tenant's subscription object
 * @returns {boolean}
 */
export const requiresWatermark = (subscription) => {
  if (!subscription) return true; // Default to watermark if no subscription
  const planKey = subscription.planSnapshot?.key || subscription.planKey;
  return planKey === 'free';
};

/**
 * Get watermark HTML snippet
 * @param {Object} options
 * @param {string} [options.ctaLink] - Optional upgrade link
 * @returns {string}
 */
export const getWatermarkHtml = (options = {}) => {
  const { ctaLink = '/signup' } = options;
  return `
    <div class="watermark-venuepro" style="
      text-align: center;
      padding: 8px 12px;
      margin-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      letter-spacing: 0.5px;
    ">
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        ${WATERMARK_TEXT}
      </span>
      <a href="${ctaLink}" style="
        margin-left: 8px;
        color: #6366f1;
        text-decoration: none;
        font-weight: 500;
      ">Upgrade to remove →</a>
    </div>
  `;
};

/**
 * Get watermark text (for plain text outputs like SMS)
 * @returns {string}
 */
export const getWatermarkText = () => {
  return `${WATERMARK_TEXT} — Upgrade to remove watermark`;
};

/**
 * Middleware to attach watermark info to response
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
export const attachWatermarkInfo = (req, res, next) => {
  const subscription = req.subscription;
  req.hasWatermark = requiresWatermark(subscription);
  next();
};

export default {
  requiresWatermark,
  getWatermarkHtml,
  getWatermarkText,
  attachWatermarkInfo
};
