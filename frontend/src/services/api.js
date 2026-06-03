import axios from 'axios';

// Force Render to rebuild the frontend so VITE_API_URL is properly injected
const RAW_BASE = import.meta.env.VITE_API_URL || '';
let BASE = RAW_BASE.replace(/\/+$/, '');
if (BASE && !BASE.startsWith('http')) {
  BASE = `https://${BASE}`;
}

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 300_000, // 5 min for OSMnx fetch
});

// ── Countries ─────────────────────────────────────────────────
export const getCountries = () =>
  api.get('/countries').then(r => r.data);

export const selectCountry = (country) =>
  api.post('/select_country', { country }).then(r => r.data);

export const selectState = (session_id, state) =>
  api.post('/select_state', { session_id, state }).then(r => r.data);

// ── Data ──────────────────────────────────────────────────────
export const loadData = (session_id, storesFile, requestsFile) => {
  const fd = new FormData();
  fd.append('session_id', session_id);
  fd.append('stores_file', storesFile);
  if (requestsFile) fd.append('requests_file', requestsFile);
  return api.post('/load_data', fd).then(r => r.data);
};

export const loadPreloaded = (session_id) =>
  api.post('/load_preloaded', { session_id }).then(r => r.data);

// ── Amenities ─────────────────────────────────────────────────
export const fetchAmenities = (session_id) =>
  api.post('/fetch_amenities', { session_id }).then(r => r.data);

export const getAmenitiesStatus = (session_id, country, state) =>
  api.get('/amenities_status', { params: { session_id, country, state } }).then(r => r.data);

// ── Business Units ────────────────────────────────────────────
export const uploadBusinessUnits = (session_id, buFile) => {
  const fd = new FormData();
  fd.append('session_id', session_id);
  fd.append('bu_file', buFile);
  return api.post('/upload_business_units', fd).then(r => r.data);
};

export const clearBusinessUnits = (session_id) =>
  api.delete(`/business_units?session_id=${session_id}`).then(r => r.data);

// ── Predict ───────────────────────────────────────────────────
export const runPrediction = async (sessionId, topN = 10) => {
  const { data } = await api.post('/predict', { session_id: sessionId, top_n: topN });
  return data;
};

// ── Results ───────────────────────────────────────────────────
export const getResults = async (sessionId) => {
  const { data } = await api.get(`/results/get_results?session_id=${sessionId}`);
  return data;
};

export const getRegionKpis = async (sessionId) => {
  const { data } = await api.get(`/region-kpis?session_id=${sessionId}`);
  return data;
};

export const getDownloadUrl = (session_id) =>
  `${BASE}/api/download_results?session_id=${session_id}`;
