import axios from 'axios'

const api = axios.create({ baseURL: '', withCredentials: true })

export const assetApi = {
  getAll: () => api.get('/api/assets'),
  buy: (data) => api.post('/api/assets/buy', data),
  sell: (id, data) => api.post(`/api/assets/${id}/sell`, data),
  update: (id, data) => api.put(`/api/assets/${id}`, data),
  delete: (id) => api.delete(`/api/assets/${id}`),
}

export const dashboardApi = {
  get: () => api.get('/api/dashboard'),
}

export const transactionApi = {
  getAll: (params) => api.get('/api/transactions', { params }),
  getById: (id) => api.get(`/api/transactions/${id}`),
  delete: (id) => api.delete(`/api/transactions/${id}`),
}

export const marketApi = {
  search: (q) => api.get('/api/market/search', { params: { q } }),
  overview: () => api.get('/api/market/overview'),
  history: (symbol, assetType, range) =>
    api.get(`/api/market/history/${encodeURIComponent(symbol)}`, { params: { assetType, range } }),
  priceOn: (symbol, assetType, date) =>
    api.get(`/api/market/price-on/${encodeURIComponent(symbol)}`, { params: { assetType, date } }),
}
