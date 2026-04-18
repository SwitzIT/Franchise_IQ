import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

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
export const runPrediction = (session_id, top_n = 10) =>
  api.post('/predict', { session_id, top_n }).then(r => r.data);

// ── Results ───────────────────────────────────────────────────
export const getResults = (session_id) =>
  api.get(`/get_results?session_id=${session_id}`).then(r => r.data);

export const getDownloadUrl = (session_id) =>
  `${BASE}/api/download_results?session_id=${session_id}`;
