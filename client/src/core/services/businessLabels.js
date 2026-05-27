/**
 * Business Type Labels — Shared utility for dynamic labels across owner pages.
 *
 * Each business type (pool_snooker, pickleball, cricket_football, gaming_zone)
 * has its own set of resource/customer labels.
 */

const LABEL_MAPS = {
  pool_snooker: {
    // OwnerLayout sidebar
    resourceSingular: 'Table',
    resourcePlural: 'Tables',
    customerSingular: 'Player',
    customerPlural: 'Players',
    businessTypeName: 'Pool & Snooker Parlour',
    // Resources page
    resourcePlaceholder: 'e.g. Table 1',
    resourceDesc: 'tables',
    // Staff page
    staffResource: 'Tables',
    staffCustomer: 'Players'
  },
  pickleball: {
    resourceSingular: 'Court',
    resourcePlural: 'Courts',
    customerSingular: 'Player',
    customerPlural: 'Players',
    businessTypeName: 'Pickleball Court',
    resourcePlaceholder: 'e.g. Court 1',
    resourceDesc: 'courts',
    staffResource: 'Courts',
    staffCustomer: 'Players'
  },
  cricket_football: {
    resourceSingular: 'Turf',
    resourcePlural: 'Turfs',
    customerSingular: 'Player',
    customerPlural: 'Players',
    businessTypeName: 'Cricket & Football Turf',
    resourcePlaceholder: 'e.g. Turf A',
    resourceDesc: 'turfs',
    staffResource: 'Turfs',
    staffCustomer: 'Players'
  },
  gaming_zone: {
    resourceSingular: 'Console',
    resourcePlural: 'Consoles',
    customerSingular: 'Player',
    customerPlural: 'Players',
    businessTypeName: 'Gaming Zone',
    resourcePlaceholder: 'e.g. Console 1',
    resourceDesc: 'consoles',
    staffResource: 'Consoles',
    staffCustomer: 'Players'
  }
};

const DEFAULT_TYPE = 'pool_snooker';

/**
 * Get all labels for a given business type.
 * Falls back to pool_snooker labels if the business type is unknown.
 */
export function getBusinessLabels(businessType) {
  return LABEL_MAPS[businessType] || LABEL_MAPS[DEFAULT_TYPE];
}
