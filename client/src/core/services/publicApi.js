// ============================================================
// PUBLIC API SERVICE — No auth required
// ============================================================
// Used by landing page, signup form, pricing page, and demo.
// These endpoints do NOT require authentication.

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const publicApi = axios.create({
  baseURL: `${API_BASE}/api/public`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Demo API — start a demo tenant
// POST /api/public/demo/start
export const startDemo = async (businessTypeKey) => {
  const { data } = await publicApi.post('/demo/start', { businessTypeKey });
  return data;
};

// Demo API — reset demo data
// POST /api/public/demo/reset
export const resetDemo = async (tenantId, businessTypeKey) => {
  const { data } = await publicApi.post('/demo/reset', { tenantId, businessTypeKey });
  return data;
};

// ============================================================
// PUBLIC VENUE AVAILABILITY — No auth required
// ============================================================

// GET /api/player/venues — Browse all active venues with live availability counts
export const getVenues = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.city) query.set('city', params.city);
  const qs = query.toString();
  const { data } = await axios.get(`${API_BASE}/api/player/venues${qs ? `?${qs}` : ''}`);
  return data;
};

// GET /api/player/venues/:tenantId/resources — List resources with live status
export const getVenueResources = async (tenantId) => {
  const { data } = await axios.get(`${API_BASE}/api/player/venues/${tenantId}/resources`);
  return data;
};

export default publicApi;
