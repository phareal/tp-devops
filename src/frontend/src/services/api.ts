import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Products
export const productApi = {
  list: (params?: Record<string, string | number>) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  categories: () => api.get('/products/categories'),
  create: (data: object) => api.post('/products', data),
  update: (id: string, data: object) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Cart
export const cartApi = {
  get: () => api.get('/cart'),
  add: (productId: string, quantity = 1) => api.post('/cart/items', { productId, quantity }),
  update: (itemId: string, quantity: number) => api.patch(`/cart/items/${itemId}`, { quantity }),
  remove: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
};

// Orders
export const orderApi = {
  list: () => api.get('/orders'),
  get: (id: string) => api.get(`/orders/${id}`),
  create: () => api.post('/orders'),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
};
