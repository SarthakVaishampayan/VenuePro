import TenantSetting from '../models/TenantSetting.js';
import { success, error } from '../../../core/utils/responseHelper.js';

/**
 * @swagger
 * /api/tenant/settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get all settings as key-value map
 */
export const getAllSettings = async (req, res, next) => {
  try {
    const settings = await TenantSetting.find({ tenantId: req.tenantId });
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    return success(res, { data: settingsObj });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/settings:
 *   put:
 *     tags: [Settings]
 *     summary: Upsert a setting
 */
export const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key) {
      return error(res, { statusCode: 400, message: 'Key is required', code: 'MISSING_FIELDS' });
    }

    const setting = await TenantSetting.findOneAndUpdate(
      { tenantId: req.tenantId, key },
      { tenantId: req.tenantId, key, value },
      { upsert: true, new: true }
    );
    return success(res, { data: { key: setting.key, value: setting.value } });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/settings/bulk:
 *   put:
 *     tags: [Settings]
 *     summary: Bulk update settings
 */
export const bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings)) {
      return error(res, { statusCode: 400, message: 'Settings array is required', code: 'MISSING_FIELDS' });
    }

    const operations = settings.map(s => ({
      updateOne: {
        filter: { tenantId: req.tenantId, key: s.key },
        update: { tenantId: req.tenantId, key: s.key, value: s.value },
        upsert: true
      }
    }));

    await TenantSetting.bulkWrite(operations);

    // Return updated settings
    const updatedSettings = await TenantSetting.find({ tenantId: req.tenantId });
    const settingsObj = {};
    updatedSettings.forEach(s => { settingsObj[s.key] = s.value; });

    return success(res, { data: settingsObj });
  } catch (err) {
    next(err);
  }
};
