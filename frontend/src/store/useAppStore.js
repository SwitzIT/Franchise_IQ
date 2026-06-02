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
  currencySymbol: '$',
  currencyCode:   'USD',
  state:   null,
  stateConfig: null,   // {center, zoom, has_kitchen, default_kitchen}
  availableStates: [],

  setCountry: (country, states, symbol, code) => set({
    country,
    availableStates: states,
    currencySymbol: symbol || '$',
    currencyCode: code || 'USD',
    state: null,
    stateConfig: null
  }),
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
    stores:        true,
    requests:      true,
    predictions:   true,
    businessUnits: true,
    amenities:     true,
  },
  toggleLayer: (layer) =>
    set((s) => ({ mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] } })),

  selectedMarker: null,
  setSelectedMarker: (m) => set({ selectedMarker: m }),

  // ── Fly-to coords (map) ──────────────────────────────────────
  flyToCoords: null,

  // ── Store Performance Filter ─────────────────────────────────
  storeFilter: 'all',   // 'all' | 'above' | 'below'
  setStoreFilter: (f) => set({ storeFilter: f }),

  // ── Franchise Store Selector (for map fly-to) ────────────────
  selectedStoreName: null,

  flyToStore: (name) => {
    if (!name) {
      set({ selectedStoreName: null, flyToCoords: null });
      return;
    }
    const { results } = get();
    const stores = results?.stores || [];
    const store = stores.find(s => s.name === name);
    if (store) {
      set({
        selectedStoreName: name,
        flyToCoords: { lat: store.lat, lng: store.lng, zoom: 16 },
      });
    }
  },

  // ── Region KPIs ──────────────────────────────────────────────
  regionKpis: null,
  selectedRegion: null,
  setRegionKpis: (kpis) => set({ regionKpis: kpis }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),

  // ── Chat ─────────────────────────────────────────────────────
  chatOpen: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  // ── Loading ──────────────────────────────────────────────────
  loading: false,
  loadingMsg: '',
  setLoading: (v, msg = '') => set({ loading: v, loadingMsg: msg }),

  // ── Reset ────────────────────────────────────────────────────
  reset: () => set({
    step: 'country', sessionId: null, country: null, state: null,
    stateConfig: null, availableStates: [], nStores: 0, nRequests: 0,
    amenitiesInfo: null, hasBU: false, buInfo: null, results: null,
    regionKpis: null, selectedRegion: null, chatOpen: false,
    loading: false, loadingMsg: '', selectedStoreName: null,
    flyToCoords: null, storeFilter: 'all',
  }),
}));

export default useAppStore;
