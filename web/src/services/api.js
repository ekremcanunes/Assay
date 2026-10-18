import axios from 'axios'

const api = axios.create({ baseURL: '', withCredentials: true })

// Oturum şifreyle açılmış ama e-posta kodu girilmemiş (AAL1): backend 403 aal2_required döner → kod adımına git.
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 403 && error.response.data?.error === 'aal2_required') {
    window.location.assign('/login?aal2=1')
  }
  return Promise.reject(error)
})

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
