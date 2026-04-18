import { create } from 'zustand';

// Steps: 'country' | 'state' | 'upload' | 'amenities' | 'bu_question' | 'predicting' | 'dashboard'
const useAppStore = create((set, get) => ({
  // ── Navigation ──────────────────────────────────────────────
  step: 'country',
  setStep: (step) => set({ step }),

  // ── Session ─────────────────────────────────────────────────
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  // ── Location Selection ───────────────────────────────────────
  country: null,
  state:   null,
  stateConfig: null,   // {center, zoom, has_kitchen, default_kitchen}
  availableStates: [],

  setCountry: (country, states) => set({ country, availableStates: states,
    state: null, stateConfig: null }),
  setState: (state, config) => set({ state, stateConfig: config }),

  // ── Data ────────────────────────────────────────────────────
  nStores:    0,
  nRequests:  0,
  nDemog:     0,
  setDataStats: (s) => set({ nStores: s.n_stores, nRequests: s.n_requests, nDemog: s.n_demographics }),

  // ── Amenities ───────────────────────────────────────────────
  amenitiesInfo: null,
  setAmenitiesInfo: (info) => set({ amenitiesInfo: info }),

  // ── Business Units ──────────────────────────────────────────
  hasBU: false,
  buInfo: null,
  setHasBU: (v) => set({ hasBU: v }),
  setBUInfo: (info) => set({ buInfo: info }),

  // ── Results / Map Data ──────────────────────────────────────
  results: null,         // full API response
  setResults: (r) => set({ results: r }),

  // ── Map UI State ─────────────────────────────────────────────
  mapLayers: {
    stores:      true,
    requests:    true,
    predictions: true,
    businessUnits: true,
    amenities:   true,
  },
  toggleLayer: (layer) =>
    set((s) => ({ mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] } })),

  selectedMarker: null,
  setSelectedMarker: (m) => set({ selectedMarker: m }),

  // ── Loading ──────────────────────────────────────────────────
  loading: false,
  loadingMsg: '',
  setLoading: (v, msg = '') => set({ loading: v, loadingMsg: msg }),

  // ── Reset ────────────────────────────────────────────────────
  reset: () => set({
    step: 'country', sessionId: null, country: null, state: null,
    stateConfig: null, availableStates: [], nStores: 0, nRequests: 0,
    amenitiesInfo: null, hasBU: false, buInfo: null, results: null,
    loading: false, loadingMsg: '',
  }),
}));

export default useAppStore;
