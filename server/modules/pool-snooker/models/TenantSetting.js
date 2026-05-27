import mongoose from 'mongoose';

const tenantSettingSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  key: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

tenantSettingSchema.index({ tenantId: 1, key: 1 }, { unique: true });

const TenantSetting = mongoose.model('TenantSetting', tenantSettingSchema);
export default TenantSetting;
