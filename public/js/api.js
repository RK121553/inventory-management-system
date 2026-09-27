// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Centralized API Client (Fetch API) with Single-Admin Authentication Guard
// ============================================================================

const API_BASE = '/api';
const TOKEN_KEY = 'ims_admin_token';

const API = {
  // Token Storage Management (sessionStorage ensures tokens are cleared on browser close)
  getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  },

  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  },

  // Generic request handler
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Attach Bearer token if session exists
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      headers,
      ...options
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // If 401 Unauthorized occurs on an authenticated route
        if (response.status === 401 && endpoint !== '/auth/login') {
          this.clearToken();
          if (typeof window.handleAuthExpired === 'function') {
            window.handleAuthExpired();
          }
        }
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // --------------------------------------------------------------------------
  // Authentication Endpoints
  // --------------------------------------------------------------------------
  async login(username, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res && res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout notification error:', e.message);
    } finally {
      this.clearToken();
    }
  },

  async verifyAuth() {
    const token = this.getToken();
    if (!token) return { success: false, authenticated: false };
    try {
      return await this.request('/auth/verify', { method: 'GET' });
    } catch (e) {
      this.clearToken();
      return { success: false, authenticated: false };
    }
  },

  // --------------------------------------------------------------------------
  // Entity Endpoints
  // --------------------------------------------------------------------------
  // 1. Dashboard
  getDashboardStats() {
    return this.request('/dashboard/stats');
  },

  // 2. Categories
  getCategories() {
    return this.request('/categories');
  },
  getCategoryById(id) {
    return this.request(`/categories/${id}`);
  },
  createCategory(payload) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateCategory(id, payload) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  },

  // 3. Products
  getProducts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.low_stock) params.append('low_stock', filters.low_stock);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/products${queryStr}`);
  },
  getLowStockProducts() {
    return this.request('/products/low-stock');
  },
  getProductById(id) {
    return this.request(`/products/${id}`);
  },
  createProduct(payload) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateProduct(id, payload) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  // 4. Suppliers
  getSuppliers(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/suppliers${query}`);
  },
  getSupplierById(id) {
    return this.request(`/suppliers/${id}`);
  },
  createSupplier(payload) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateSupplier(id, payload) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteSupplier(id) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE'
    });
  },

  // 5. Customers
  getCustomers(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/customers${query}`);
  },
  getCustomerById(id) {
    return this.request(`/customers/${id}`);
  },
  createCustomer(payload) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateCustomer(id, payload) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteCustomer(id) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE'
    });
  },

  // 6. Purchases (Multi-Product Transaction)
  getPurchases() {
    return this.request('/purchases');
  },
  getPurchaseById(id) {
    return this.request(`/purchases/${id}`);
  },
  createPurchase(payload) {
    return this.request('/purchases', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 7. Sales (Multi-Product Transaction with Stock Sufficiency Guard)
  getSales() {
    return this.request('/sales');
  },
  getSaleById(id) {
    return this.request(`/sales/${id}`);
  },
  createSale(payload) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
