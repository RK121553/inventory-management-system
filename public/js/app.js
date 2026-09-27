// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Main Frontend Application Logic & User Interface Controller
// ============================================================================

// Global application state cache
const state = {
  activeSection: 'dashboard',
  categories: [],
  products: [],
  suppliers: [],
  customers: [],
  lowStockCount: 0
};

// Modals instances
let categoryModal, productModal, supplierModal, customerModal, purchaseModal, saleModal, invoiceModal;

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Single-Admin Authentication State & UI Controllers
// ----------------------------------------------------------------------------
function showLoginInterface(errorMessage = null) {
  const appContainer = document.getElementById('app-container');
  const loginContainer = document.getElementById('login-container');
  if (appContainer) {
    appContainer.classList.add('d-none');
    appContainer.style.display = 'none';
  }
  if (loginContainer) {
    loginContainer.classList.remove('d-none');
    loginContainer.style.display = 'flex';
  }

  const alertEl = document.getElementById('login-error-alert');
  const errorText = document.getElementById('login-error-text');
  if (alertEl && errorText) {
    if (errorMessage) {
      errorText.textContent = errorMessage;
      alertEl.classList.remove('d-none');
    } else {
      alertEl.classList.add('d-none');
    }
  }

  const passInput = document.getElementById('login-password');
  if (passInput) passInput.value = '';
}

async function showAppInterface(username = 'admin') {
  const loginContainer = document.getElementById('login-container');
  const appContainer = document.getElementById('app-container');

  // Immediately hide login screen and reveal dashboard application container
  if (loginContainer) {
    loginContainer.classList.add('d-none');
    loginContainer.style.display = 'none';
  }
  if (appContainer) {
    appContainer.classList.remove('d-none');
    appContainer.style.display = 'block';
  }

  const userBadge = document.getElementById('top-admin-user');
  if (userBadge) userBadge.textContent = username;

  // Refresh lookups and display initial dashboard
  try {
    await refreshAllLookups();
  } catch (err) {
    console.error('Failed to load initial lookups:', err);
  }

  try {
    navigateTo('dashboard');
  } catch (err) {
    console.error('Failed to navigate to dashboard:', err);
  }
}

async function handleLogin(event) {
  if (event) {
    event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }

  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const alertEl = document.getElementById('login-error-alert');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnText = document.getElementById('login-btn-text');
  const btnSpinner = document.getElementById('login-btn-spinner');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    if (alertEl && errorText) {
      errorText.textContent = 'Please enter both username and password.';
      alertEl.classList.remove('d-none');
    }
    return;
  }

  // Button loading state
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.classList.add('d-none');
  if (btnSpinner) btnSpinner.classList.remove('d-none');
  if (alertEl) alertEl.classList.add('d-none');

  try {
    const res = await API.login(username, password);
    if (res && res.token) {
      showToast('Welcome, Administrator! Authenticated successfully.', 'success');
      await showAppInterface(res.username || username);
    } else {
      throw new Error(res?.message || 'Login failed. Please verify credentials.');
    }
  } catch (error) {
    if (alertEl && errorText) {
      errorText.textContent = error.message || 'Invalid username or password.';
      alertEl.classList.remove('d-none');
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.classList.remove('d-none');
    if (btnSpinner) btnSpinner.classList.add('d-none');
  }
}

async function handleLogout() {
  try {
    await API.logout();
  } catch (e) {
    console.warn('Logout notification error:', e.message);
  } finally {
    showToast('Administrator logged out successfully.', 'info');
    showLoginInterface();
  }
}

window.handleAuthExpired = function() {
  showLoginInterface('Your session has expired or requires authorization. Please sign in again.');
  showToast('Session expired. Please sign in again.', 'warning');
};

// ----------------------------------------------------------------------------
// Initialization on Page Load
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Bootstrap Modals
  categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  supplierModal = new bootstrap.Modal(document.getElementById('supplierModal'));
  customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
  purchaseModal = new bootstrap.Modal(document.getElementById('purchaseModal'));
  saleModal = new bootstrap.Modal(document.getElementById('saleModal'));
  invoiceModal = new bootstrap.Modal(document.getElementById('invoiceDetailsModal'));

  // Check existing session token
  const token = API.getToken();
  if (token) {
    try {
      const verifyRes = await API.verifyAuth();
      if (verifyRes && verifyRes.authenticated) {
        await showAppInterface(verifyRes.username || 'admin');
        return;
      }
    } catch (e) {
      console.warn('Initial session validation failed:', e.message);
    }
  }

  // Not authenticated: present the login interface
  showLoginInterface();
});

window.addEventListener('pageshow', async () => {
  const token = API.getToken();
  if (!token) {
    showLoginInterface();
  }
});

async function refreshAllLookups() {
  try {
    const [catRes, prodRes, suppRes, custRes] = await Promise.all([
      API.getCategories(),
      API.getProducts(),
      API.getSuppliers(),
      API.getCustomers()
    ]);
    state.categories = catRes.data || [];
    state.products = prodRes.data || [];
    state.suppliers = suppRes.data || [];
    state.customers = custRes.data || [];
    populateCategoryDropdowns();
  } catch (error) {
    showToast('Failed to load master lookup data: ' + error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// Navigation Controller
// ----------------------------------------------------------------------------
function navigateTo(section) {
  state.activeSection = section;

  // Update sidebar active link
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === section);
  });

  // Toggle view containers
  const sections = ['dashboard', 'products', 'categories', 'suppliers', 'customers', 'purchases', 'sales', 'lowstock', 'reports'];
  sections.forEach(s => {
    const el = document.getElementById(`view-${s}`);
    if (el) el.style.display = (s === section) ? 'block' : 'none';
  });

  // Update Top Navbar Title
  const titles = {
    dashboard: { title: 'Dashboard', sub: 'Real-time inventory metrics and database state' },
    products: { title: 'Products Management', sub: 'Catalog inventory items, stock levels, and reorder levels' },
    categories: { title: 'Category Management', sub: 'Classify inventory items into logical groups' },
    suppliers: { title: 'Suppliers Directory', sub: 'Procurement vendors and historical order values' },
    customers: { title: 'Customers Directory', sub: 'Client profiles and cumulative sales spend' },
    purchases: { title: 'Purchase Orders (Stock Inflow)', sub: 'Multi-product vendor replenishment orders' },
    sales: { title: 'Sales Invoices (Stock Outflow)', sub: 'Multi-product customer fulfillment orders' },
    lowstock: { title: 'Low Stock Alerts', sub: 'Products at or below their designated reorder threshold' },
    reports: { title: 'Analytical DBMS Reports', sub: 'Reports generated from database views and aggregate queries' }
  };

  const navInfo = titles[section] || { title: 'Inventory Management', sub: '' };
  document.getElementById('navbar-page-title').innerText = navInfo.title;
  document.getElementById('navbar-page-subtitle').innerText = navInfo.sub;

  // Fetch section data
  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'categories': loadCategories(); break;
    case 'suppliers': loadSuppliers(); break;
    case 'customers': loadCustomers(); break;
    case 'purchases': loadPurchases(); break;
    case 'sales': loadSales(); break;
    case 'lowstock': loadLowStock(); break;
    case 'reports': loadReports(); break;
  }
}

// ----------------------------------------------------------------------------
// 1. Dashboard View
// ----------------------------------------------------------------------------
async function loadDashboard() {
  try {
    const res = await API.getDashboardStats();
    if (!res.success) return;

    const { summary, lowStockProducts, recentPurchases, recentSales } = res.data;

    // KPI Cards
    document.getElementById('dash-total-products').innerText = summary.totalProducts;
    document.getElementById('dash-total-categories').innerText = summary.totalCategories;
    document.getElementById('dash-total-suppliers').innerText = summary.totalSuppliers;
    document.getElementById('dash-total-customers').innerText = summary.totalCustomers;
    document.getElementById('dash-stock-units').innerText = summary.totalStockUnits.toLocaleString();
    document.getElementById('dash-low-stock-count').innerText = summary.lowStockCount;
    document.getElementById('dash-procurement-spend').innerText = formatCurrency(summary.totalPurchaseSpend);
    document.getElementById('dash-sales-revenue').innerText = formatCurrency(summary.totalSalesRevenue);

    // Update Low Stock badge on sidebar
    const badge = document.getElementById('sidebar-lowstock-badge');
    badge.innerText = summary.lowStockCount;
    badge.style.display = summary.lowStockCount > 0 ? 'inline-block' : 'none';

    // Recent Purchases Table
    const purTbody = document.getElementById('dash-recent-purchases-tbody');
    if (!recentPurchases || recentPurchases.length === 0) {
      purTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No recent purchases found.</td></tr>';
    } else {
      purTbody.innerHTML = recentPurchases.map(p => `
        <tr>
          <td><span class="badge bg-secondary">#${p.Purchase_ID}</span></td>
          <td class="fw-semibold">${escapeHtml(p.Supplier_Name)}</td>
          <td><span class="badge bg-light text-dark">${p.Total_Items} items</span></td>
          <td class="fw-bold text-success">${formatCurrency(p.Total_Amount)}</td>
        </tr>
      `).join('');
    }

    // Recent Sales Table
    const saleTbody = document.getElementById('dash-recent-sales-tbody');
    if (!recentSales || recentSales.length === 0) {
      saleTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No recent sales found.</td></tr>';
    } else {
      saleTbody.innerHTML = recentSales.map(s => `
        <tr>
          <td><span class="badge bg-secondary">#${s.Sale_ID}</span></td>
          <td class="fw-semibold">${escapeHtml(s.Customer_Name)}</td>
          <td><span class="badge bg-light text-dark">${s.Total_Items} items</span></td>
          <td class="fw-bold text-primary">${formatCurrency(s.Total_Amount)}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    showToast('Failed to load dashboard: ' + error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 2. Product Management
// ----------------------------------------------------------------------------
async function loadProducts() {
  const search = document.getElementById('product-search-input')?.value || '';
  const category_id = document.getElementById('product-category-filter')?.value || '';

  try {
    const res = await API.getProducts({ search, category_id });
    const tbody = document.getElementById('products-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No products found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(p => `
      <tr>
        <td><span class="text-muted fw-bold">#${p.Product_ID}</span></td>
        <td class="fw-bold text-dark">${escapeHtml(p.Product_Name)}</td>
        <td><span class="badge bg-light text-dark border">${escapeHtml(p.Category_Name)}</span></td>
        <td class="fw-semibold">${formatCurrency(p.Price)}</td>
        <td>
          <span class="fw-bold fs-6 ${p.Is_Low_Stock ? 'text-danger' : 'text-success'}">
            ${p.Stock_Quantity} units
          </span>
        </td>
        <td>${p.Reorder_Level}</td>
        <td>
          ${p.Is_Low_Stock
            ? `<span class="badge-low-stock"><i class="bi bi-exclamation-circle-fill"></i> Low Stock (${p.Reorder_Deficit} needed)</span>`
            : `<span class="badge-in-stock"><i class="bi bi-check-circle-fill"></i> In Stock</span>`
          }
        </td>
        <td class="text-end">
          <button class="btn btn-outline-primary btn-sm me-1" onclick="editProduct(${p.Product_ID})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteProduct(${p.Product_ID}, '${escapeHtml(p.Product_Name)}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading products: ' + error.message, 'danger');
  }
}

function handleProductSearch() {
  loadProducts();
}
function handleProductFilter() {
  loadProducts();
}

function populateCategoryDropdowns() {
  const filterSelect = document.getElementById('product-category-filter');
  const modalSelect = document.getElementById('product-category');

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
      state.categories.map(c => `<option value="${c.Category_ID}">${escapeHtml(c.Category_Name)}</option>`).join('');
  }
  if (modalSelect) {
    modalSelect.innerHTML = '<option value="">Select Category</option>' +
      state.categories.map(c => `<option value="${c.Category_ID}">${escapeHtml(c.Category_Name)}</option>`).join('');
  }
}

function openProductModal(prod = null) {
  document.getElementById('productForm').reset();
  if (prod) {
    document.getElementById('productModalTitle').innerText = 'Edit Product';
    document.getElementById('product-id').value = prod.Product_ID;
    document.getElementById('product-name').value = prod.Product_Name;
    document.getElementById('product-category').value = prod.Category_ID;
    document.getElementById('product-price').value = prod.Price;
    document.getElementById('product-stock').value = prod.Stock_Quantity;
    document.getElementById('product-reorder').value = prod.Reorder_Level;
  } else {
    document.getElementById('productModalTitle').innerText = 'Add Product';
    document.getElementById('product-id').value = '';
    document.getElementById('product-stock').value = 0;
    document.getElementById('product-reorder').value = 10;
  }
  productModal.show();
}

async function editProduct(id) {
  try {
    const res = await API.getProductById(id);
    if (res.success) openProductModal(res.data);
  } catch (error) {
    showToast('Error fetching product: ' + error.message, 'danger');
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById('product-id').value;
  const payload = {
    Product_Name: document.getElementById('product-name').value,
    Category_ID: parseInt(document.getElementById('product-category').value, 10),
    Price: parseFloat(document.getElementById('product-price').value),
    Stock_Quantity: parseInt(document.getElementById('product-stock').value, 10),
    Reorder_Level: parseInt(document.getElementById('product-reorder').value, 10)
  };

  try {
    if (id) {
      await API.updateProduct(id, payload);
      showToast('Product updated successfully.');
    } else {
      await API.createProduct(payload);
      showToast('Product created successfully.');
    }
    productModal.hide();
    await refreshAllLookups();
    loadProducts();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
  try {
    await API.deleteProduct(id);
    showToast(`Product "${name}" deleted.`);
    await refreshAllLookups();
    loadProducts();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 3. Category Management
// ----------------------------------------------------------------------------
async function loadCategories() {
  try {
    const res = await API.getCategories();
    const tbody = document.getElementById('categories-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No categories found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td><span class="text-muted fw-bold">#${c.Category_ID}</span></td>
        <td class="fw-bold">${escapeHtml(c.Category_Name)}</td>
        <td class="text-muted">${escapeHtml(c.Description || 'None')}</td>
        <td>
          <span class="badge ${c.Product_Count > 0 ? 'bg-primary' : 'bg-secondary'} rounded-pill">
            ${c.Product_Count} products
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-outline-primary btn-sm me-1" onclick="editCategory(${c.Category_ID}, '${escapeHtml(c.Category_Name)}', '${escapeHtml(c.Description || '')}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteCategory(${c.Category_ID}, '${escapeHtml(c.Category_Name)}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading categories: ' + error.message, 'danger');
  }
}

function openCategoryModal(cat = null) {
  document.getElementById('categoryForm').reset();
  if (cat) {
    document.getElementById('categoryModalTitle').innerText = 'Edit Category';
    document.getElementById('category-id').value = cat.Category_ID;
    document.getElementById('category-name').value = cat.Category_Name;
    document.getElementById('category-description').value = cat.Description || '';
  } else {
    document.getElementById('categoryModalTitle').innerText = 'Add Category';
    document.getElementById('category-id').value = '';
  }
  categoryModal.show();
}

function editCategory(id, name, desc) {
  openCategoryModal({ Category_ID: id, Category_Name: name, Description: desc });
}

async function saveCategory(event) {
  event.preventDefault();
  const id = document.getElementById('category-id').value;
  const payload = {
    Category_Name: document.getElementById('category-name').value,
    Description: document.getElementById('category-description').value
  };

  try {
    if (id) {
      await API.updateCategory(id, payload);
      showToast('Category updated successfully.');
    } else {
      await API.createCategory(payload);
      showToast('Category created successfully.');
    }
    categoryModal.hide();
    await refreshAllLookups();
    loadCategories();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
  try {
    await API.deleteCategory(id);
    showToast(`Category "${name}" deleted.`);
    await refreshAllLookups();
    loadCategories();
  } catch (error) {
    // Shows user-friendly message when restricted by child products
    showToast(error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 4. Supplier Management
// ----------------------------------------------------------------------------
async function loadSuppliers() {
  const search = document.getElementById('supplier-search-input')?.value || '';
  try {
    const res = await API.getSuppliers(search);
    const tbody = document.getElementById('suppliers-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No suppliers found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(s => `
      <tr>
        <td><span class="text-muted fw-bold">#${s.Supplier_ID}</span></td>
        <td class="fw-bold">${escapeHtml(s.Supplier_Name)}</td>
        <td><a href="tel:${escapeHtml(s.Phone)}" class="text-decoration-none">${escapeHtml(s.Phone)}</a></td>
        <td><small class="text-muted">${escapeHtml(s.Email || '-')}</small></td>
        <td><small class="text-muted">${escapeHtml(s.Address || '-')}</small></td>
        <td><span class="badge bg-light text-dark border">${s.Total_Purchases} orders</span></td>
        <td class="fw-bold text-success">${formatCurrency(s.Total_Supplied_Amount)}</td>
        <td class="text-end">
          <button class="btn btn-outline-primary btn-sm me-1" onclick="editSupplier(${s.Supplier_ID})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteSupplier(${s.Supplier_ID}, '${escapeHtml(s.Supplier_Name)}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading suppliers: ' + error.message, 'danger');
  }
}

function handleSupplierSearch() {
  loadSuppliers();
}

function openSupplierModal(sup = null) {
  document.getElementById('supplierForm').reset();
  if (sup) {
    document.getElementById('supplierModalTitle').innerText = 'Edit Supplier';
    document.getElementById('supplier-id').value = sup.Supplier_ID;
    document.getElementById('supplier-name').value = sup.Supplier_Name;
    document.getElementById('supplier-phone').value = sup.Phone;
    document.getElementById('supplier-email').value = sup.Email || '';
    document.getElementById('supplier-address').value = sup.Address || '';
  } else {
    document.getElementById('supplierModalTitle').innerText = 'Add Supplier';
    document.getElementById('supplier-id').value = '';
  }
  supplierModal.show();
}

async function editSupplier(id) {
  try {
    const res = await API.getSupplierById(id);
    if (res.success) openSupplierModal(res.data);
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function saveSupplier(event) {
  event.preventDefault();
  const id = document.getElementById('supplier-id').value;
  const payload = {
    Supplier_Name: document.getElementById('supplier-name').value,
    Phone: document.getElementById('supplier-phone').value,
    Email: document.getElementById('supplier-email').value,
    Address: document.getElementById('supplier-address').value
  };

  try {
    if (id) {
      await API.updateSupplier(id, payload);
      showToast('Supplier updated.');
    } else {
      await API.createSupplier(payload);
      showToast('Supplier created.');
    }
    supplierModal.hide();
    await refreshAllLookups();
    loadSuppliers();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function deleteSupplier(id, name) {
  if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
  try {
    await API.deleteSupplier(id);
    showToast(`Supplier "${name}" deleted.`);
    await refreshAllLookups();
    loadSuppliers();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 5. Customer Management
// ----------------------------------------------------------------------------
async function loadCustomers() {
  const search = document.getElementById('customer-search-input')?.value || '';
  try {
    const res = await API.getCustomers(search);
    const tbody = document.getElementById('customers-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No customers found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td><span class="text-muted fw-bold">#${c.Customer_ID}</span></td>
        <td class="fw-bold">${escapeHtml(c.Customer_Name)}</td>
        <td><a href="tel:${escapeHtml(c.Phone)}" class="text-decoration-none">${escapeHtml(c.Phone)}</a></td>
        <td><small class="text-muted">${escapeHtml(c.Email || '-')}</small></td>
        <td><small class="text-muted">${escapeHtml(c.Address || '-')}</small></td>
        <td><span class="badge bg-light text-dark border">${c.Total_Sales} invoices</span></td>
        <td class="fw-bold text-primary">${formatCurrency(c.Total_Spent)}</td>
        <td class="text-end">
          <button class="btn btn-outline-primary btn-sm me-1" onclick="editCustomer(${c.Customer_ID})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteCustomer(${c.Customer_ID}, '${escapeHtml(c.Customer_Name)}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading customers: ' + error.message, 'danger');
  }
}

function handleCustomerSearch() {
  loadCustomers();
}

function openCustomerModal(cust = null) {
  document.getElementById('customerForm').reset();
  if (cust) {
    document.getElementById('customerModalTitle').innerText = 'Edit Customer';
    document.getElementById('customer-id').value = cust.Customer_ID;
    document.getElementById('customer-name').value = cust.Customer_Name;
    document.getElementById('customer-phone').value = cust.Phone;
    document.getElementById('customer-email').value = cust.Email || '';
    document.getElementById('customer-address').value = cust.Address || '';
  } else {
    document.getElementById('customerModalTitle').innerText = 'Add Customer';
    document.getElementById('customer-id').value = '';
  }
  customerModal.show();
}

async function editCustomer(id) {
  try {
    const res = await API.getCustomerById(id);
    if (res.success) openCustomerModal(res.data);
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function saveCustomer(event) {
  event.preventDefault();
  const id = document.getElementById('customer-id').value;
  const payload = {
    Customer_Name: document.getElementById('customer-name').value,
    Phone: document.getElementById('customer-phone').value,
    Email: document.getElementById('customer-email').value,
    Address: document.getElementById('customer-address').value
  };

  try {
    if (id) {
      await API.updateCustomer(id, payload);
      showToast('Customer updated.');
    } else {
      await API.createCustomer(payload);
      showToast('Customer created.');
    }
    customerModal.hide();
    await refreshAllLookups();
    loadCustomers();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;
  try {
    await API.deleteCustomer(id);
    showToast(`Customer "${name}" deleted.`);
    await refreshAllLookups();
    loadCustomers();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 6. Purchases (Multi-Product Stock Inflow)
// ----------------------------------------------------------------------------
async function loadPurchases() {
  try {
    const res = await API.getPurchases();
    const tbody = document.getElementById('purchases-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No purchases found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(p => `
      <tr>
        <td><span class="badge bg-secondary fs-6">#${p.Purchase_ID}</span></td>
        <td class="fw-bold">${escapeHtml(p.Supplier_Name)}</td>
        <td><small class="text-muted">${escapeHtml(p.Supplier_Phone)}</small></td>
        <td>${formatDateTime(p.Purchase_Date)}</td>
        <td><span class="badge bg-light text-dark border">${p.Total_Line_Items} items</span></td>
        <td>${p.Total_Units_Purchased} units</td>
        <td class="fw-bold text-success fs-6">${formatCurrency(p.Total_Amount)}</td>
        <td class="text-end">
          <button class="btn btn-outline-info btn-sm" onclick="viewPurchaseDetails(${p.Purchase_ID})">
            <i class="bi bi-eye"></i> View Invoice
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading purchases: ' + error.message, 'danger');
  }
}

function openNewPurchaseModal() {
  // Populate suppliers
  const suppSelect = document.getElementById('purchase-supplier-select');
  suppSelect.innerHTML = '<option value="">-- Choose Supplier --</option>' +
    state.suppliers.map(s => `<option value="${s.Supplier_ID}">${escapeHtml(s.Supplier_Name)}</option>`).join('');

  // Default date to current local datetime
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('purchase-date-input').value = now.toISOString().slice(0, 16);

  // Clear rows and add 1 default row
  const tbody = document.getElementById('purchase-line-items-tbody');
  tbody.innerHTML = '';
  addPurchaseLineItem();

  purchaseModal.show();
}

function addPurchaseLineItem() {
  const tbody = document.getElementById('purchase-line-items-tbody');
  const rowId = Date.now() + Math.random().toString(36).substring(2, 6);

  const productOptions = state.products.map(p =>
    `<option value="${p.Product_ID}" data-price="${p.Price}">${escapeHtml(p.Product_Name)} (Current Stock: ${p.Stock_Quantity})</option>`
  ).join('');

  const tr = document.createElement('tr');
  tr.id = `purchase-row-${rowId}`;
  tr.className = 'line-item-row';
  tr.innerHTML = `
    <td>
      <select class="form-select form-select-sm purchase-prod-select" required onchange="onPurchaseProductChange('${rowId}')">
        <option value="">-- Select Product --</option>
        ${productOptions}
      </select>
    </td>
    <td>
      <input type="number" min="1" value="1" class="form-control form-select-sm purchase-qty-input" required oninput="calculatePurchaseTotals()">
    </td>
    <td>
      <input type="number" step="0.01" min="0" value="0.00" class="form-control form-select-sm purchase-price-input" required oninput="calculatePurchaseTotals()">
    </td>
    <td>
      <span class="fw-bold text-success purchase-line-total">₹0.00</span>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-outline-danger btn-sm p-1" onclick="removePurchaseLineItem('${rowId}')">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  calculatePurchaseTotals();
}

function removePurchaseLineItem(rowId) {
  const tbody = document.getElementById('purchase-line-items-tbody');
  if (tbody.children.length <= 1) {
    showToast('A purchase must contain at least one product.', 'warning');
    return;
  }
  const row = document.getElementById(`purchase-row-${rowId}`);
  if (row) row.remove();
  calculatePurchaseTotals();
}

function onPurchaseProductChange(rowId) {
  const row = document.getElementById(`purchase-row-${rowId}`);
  if (!row) return;
  const select = row.querySelector('.purchase-prod-select');
  const priceInput = row.querySelector('.purchase-price-input');
  const selectedOption = select.options[select.selectedIndex];

  if (selectedOption && selectedOption.dataset.price) {
    priceInput.value = parseFloat(selectedOption.dataset.price).toFixed(2);
  }
  calculatePurchaseTotals();
}

function calculatePurchaseTotals() {
  const rows = document.querySelectorAll('#purchase-line-items-tbody tr');
  let grandTotal = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.purchase-qty-input')?.value) || 0;
    const price = parseFloat(row.querySelector('.purchase-price-input')?.value) || 0;
    const lineTotal = qty * price;
    grandTotal += lineTotal;
    const lineTotalEl = row.querySelector('.purchase-line-total');
    if (lineTotalEl) lineTotalEl.innerText = formatCurrency(lineTotal);
  });

  document.getElementById('purchase-grand-total').innerText = formatCurrency(grandTotal);
}

async function submitPurchaseTransaction(event) {
  event.preventDefault();
  const supplierId = parseInt(document.getElementById('purchase-supplier-select').value, 10);
  const purchaseDate = document.getElementById('purchase-date-input').value;

  const rows = document.querySelectorAll('#purchase-line-items-tbody tr');
  const items = [];

  for (const row of rows) {
    const prodId = parseInt(row.querySelector('.purchase-prod-select').value, 10);
    const qty = parseInt(row.querySelector('.purchase-qty-input').value, 10);
    const price = parseFloat(row.querySelector('.purchase-price-input').value);

    if (!prodId) {
      showToast('Please select a product for all rows.', 'warning');
      return;
    }
    if (qty <= 0) {
      showToast('Quantity must be greater than zero.', 'warning');
      return;
    }
    items.push({ Product_ID: prodId, Quantity: qty, Unit_Price: price });
  }

  try {
    const res = await API.createPurchase({
      Supplier_ID: supplierId,
      Purchase_Date: purchaseDate,
      items
    });

    purchaseModal.hide();
    showToast(res.message, 'success');
    await refreshAllLookups();
    if (state.activeSection === 'purchases') loadPurchases();
    if (state.activeSection === 'dashboard') loadDashboard();
  } catch (error) {
    showToast('Purchase Failed: ' + error.message, 'danger');
  }
}

async function viewPurchaseDetails(id) {
  try {
    const res = await API.getPurchaseById(id);
    if (!res.success) return;
    const p = res.data;

    document.getElementById('invoiceModalTitle').innerHTML = `
      <i class="bi bi-bag-check text-success"></i> Purchase Order #${p.Purchase_ID}
    `;

    document.getElementById('invoiceModalBody').innerHTML = `
      <div class="row mb-3 bg-light p-3 rounded">
        <div class="col-md-6">
          <div><strong class="text-muted">Supplier:</strong> ${escapeHtml(p.Supplier_Name)}</div>
          <div><strong class="text-muted">Phone:</strong> ${escapeHtml(p.Supplier_Phone)}</div>
          <div><strong class="text-muted">Email:</strong> ${escapeHtml(p.Supplier_Email || 'None')}</div>
        </div>
        <div class="col-md-6 text-md-end">
          <div><strong class="text-muted">Order Date:</strong> ${formatDateTime(p.Purchase_Date)}</div>
          <div class="mt-2"><span class="badge bg-success fs-6">Grand Total: ${formatCurrency(p.Total_Amount)}</span></div>
        </div>
      </div>

      <h6 class="fw-bold mb-2">Line Items (${p.items.length})</h6>
      <div class="table-responsive">
        <table class="table table-bordered table-sm align-middle">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Category</th>
              <th class="text-center">Quantity</th>
              <th class="text-end">Unit Price</th>
              <th class="text-end">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${p.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="fw-semibold">${escapeHtml(item.Product_Name)}</td>
                <td><span class="badge bg-light text-dark">${escapeHtml(item.Category_Name)}</span></td>
                <td class="text-center fw-bold">${item.Quantity}</td>
                <td class="text-end">${formatCurrency(item.Unit_Price)}</td>
                <td class="text-end fw-bold text-success">${formatCurrency(item.Line_Total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="table-light fw-bold">
              <td colspan="5" class="text-end">Grand Total:</td>
              <td class="text-end text-success fs-6">${formatCurrency(p.Total_Amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    invoiceModal.show();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 7. Sales (Multi-Product Stock Outflow & Validation)
// ----------------------------------------------------------------------------
async function loadSales() {
  try {
    const res = await API.getSales();
    const tbody = document.getElementById('sales-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No sales found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(s => `
      <tr>
        <td><span class="badge bg-secondary fs-6">#${s.Sale_ID}</span></td>
        <td class="fw-bold">${escapeHtml(s.Customer_Name)}</td>
        <td><small class="text-muted">${escapeHtml(s.Customer_Phone)}</small></td>
        <td>${formatDateTime(s.Sale_Date)}</td>
        <td><span class="badge bg-light text-dark border">${s.Total_Line_Items} items</span></td>
        <td>${s.Total_Units_Sold} units</td>
        <td class="fw-bold text-primary fs-6">${formatCurrency(s.Total_Amount)}</td>
        <td class="text-end">
          <button class="btn btn-outline-info btn-sm" onclick="viewSaleDetails(${s.Sale_ID})">
            <i class="bi bi-eye"></i> View Invoice
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading sales: ' + error.message, 'danger');
  }
}

function openNewSaleModal() {
  // Populate customers
  const custSelect = document.getElementById('sale-customer-select');
  custSelect.innerHTML = '<option value="">-- Choose Customer --</option>' +
    state.customers.map(c => `<option value="${c.Customer_ID}">${escapeHtml(c.Customer_Name)}</option>`).join('');

  // Default date
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('sale-date-input').value = now.toISOString().slice(0, 16);

  // Clear rows and add 1 default row
  const tbody = document.getElementById('sale-line-items-tbody');
  tbody.innerHTML = '';
  addSaleLineItem();

  saleModal.show();
}

function addSaleLineItem() {
  const tbody = document.getElementById('sale-line-items-tbody');
  const rowId = Date.now() + Math.random().toString(36).substring(2, 6);

  const productOptions = state.products.map(p =>
    `<option value="${p.Product_ID}" data-price="${p.Price}" data-stock="${p.Stock_Quantity}">
      ${escapeHtml(p.Product_Name)} (Available: ${p.Stock_Quantity})
    </option>`
  ).join('');

  const tr = document.createElement('tr');
  tr.id = `sale-row-${rowId}`;
  tr.className = 'line-item-row';
  tr.innerHTML = `
    <td>
      <select class="form-select form-select-sm sale-prod-select" required onchange="onSaleProductChange('${rowId}')">
        <option value="">-- Select Product --</option>
        ${productOptions}
      </select>
      <div class="mt-1">
        <span class="badge bg-light text-dark border sale-stock-badge" id="stock-badge-${rowId}">Available: -</span>
      </div>
    </td>
    <td>
      <input type="number" min="1" value="1" class="form-control form-select-sm sale-qty-input" required oninput="onSaleQtyInput('${rowId}')">
      <small class="text-danger d-none sale-stock-warning" id="warning-${rowId}">Exceeds Stock!</small>
    </td>
    <td>
      <input type="number" step="0.01" min="0" value="0.00" class="form-control form-select-sm sale-price-input" required oninput="calculateSaleTotals()">
    </td>
    <td>
      <span class="fw-bold text-primary sale-line-total">₹0.00</span>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-outline-danger btn-sm p-1" onclick="removeSaleLineItem('${rowId}')">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  calculateSaleTotals();
}

function removeSaleLineItem(rowId) {
  const tbody = document.getElementById('sale-line-items-tbody');
  if (tbody.children.length <= 1) {
    showToast('A sale invoice must contain at least one product.', 'warning');
    return;
  }
  const row = document.getElementById(`sale-row-${rowId}`);
  if (row) row.remove();
  calculateSaleTotals();
}

function onSaleProductChange(rowId) {
  const row = document.getElementById(`sale-row-${rowId}`);
  if (!row) return;
  const select = row.querySelector('.sale-prod-select');
  const priceInput = row.querySelector('.sale-price-input');
  const stockBadge = document.getElementById(`stock-badge-${rowId}`);
  const selectedOption = select.options[select.selectedIndex];

  if (selectedOption && selectedOption.dataset.price) {
    priceInput.value = parseFloat(selectedOption.dataset.price).toFixed(2);
    const stock = parseInt(selectedOption.dataset.stock, 10);
    stockBadge.innerText = `Available: ${stock}`;
    stockBadge.className = stock > 0 ? 'badge bg-success' : 'badge bg-danger';
  } else {
    stockBadge.innerText = 'Available: -';
    stockBadge.className = 'badge bg-light text-dark border';
  }
  onSaleQtyInput(rowId);
}

function onSaleQtyInput(rowId) {
  const row = document.getElementById(`sale-row-${rowId}`);
  if (!row) return;
  const select = row.querySelector('.sale-prod-select');
  const qtyInput = row.querySelector('.sale-qty-input');
  const warning = document.getElementById(`warning-${rowId}`);
  const selectedOption = select.options[select.selectedIndex];

  const available = selectedOption ? parseInt(selectedOption.dataset.stock, 10) : 0;
  const requested = parseInt(qtyInput.value, 10) || 0;

  if (requested > available) {
    warning.classList.remove('d-none');
    qtyInput.classList.add('is-invalid');
  } else {
    warning.classList.add('d-none');
    qtyInput.classList.remove('is-invalid');
  }

  calculateSaleTotals();
}

function calculateSaleTotals() {
  const rows = document.querySelectorAll('#sale-line-items-tbody tr');
  let grandTotal = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.sale-qty-input')?.value) || 0;
    const price = parseFloat(row.querySelector('.sale-price-input')?.value) || 0;
    const lineTotal = qty * price;
    grandTotal += lineTotal;
    const lineTotalEl = row.querySelector('.sale-line-total');
    if (lineTotalEl) lineTotalEl.innerText = formatCurrency(lineTotal);
  });

  document.getElementById('sale-grand-total').innerText = formatCurrency(grandTotal);
}

async function submitSaleTransaction(event) {
  event.preventDefault();
  const customerId = parseInt(document.getElementById('sale-customer-select').value, 10);
  const saleDate = document.getElementById('sale-date-input').value;

  const rows = document.querySelectorAll('#sale-line-items-tbody tr');
  const items = [];

  for (const row of rows) {
    const prodId = parseInt(row.querySelector('.sale-prod-select').value, 10);
    const qty = parseInt(row.querySelector('.sale-qty-input').value, 10);
    const price = parseFloat(row.querySelector('.sale-price-input').value);

    if (!prodId) {
      showToast('Please select a product for all rows.', 'warning');
      return;
    }
    if (qty <= 0) {
      showToast('Quantity must be greater than zero.', 'warning');
      return;
    }
    items.push({ Product_ID: prodId, Quantity: qty, Unit_Price: price });
  }

  try {
    const res = await API.createSale({
      Customer_ID: customerId,
      Sale_Date: saleDate,
      items
    });

    saleModal.hide();
    showToast(res.message, 'success');
    await refreshAllLookups();
    if (state.activeSection === 'sales') loadSales();
    if (state.activeSection === 'dashboard') loadDashboard();
  } catch (error) {
    // If backend rejects due to insufficient stock or constraint
    showToast('Transaction Cancelled: ' + error.message, 'danger');
  }
}

async function viewSaleDetails(id) {
  try {
    const res = await API.getSaleById(id);
    if (!res.success) return;
    const s = res.data;

    document.getElementById('invoiceModalTitle').innerHTML = `
      <i class="bi bi-receipt text-primary"></i> Sale Invoice #${s.Sale_ID}
    `;

    document.getElementById('invoiceModalBody').innerHTML = `
      <div class="row mb-3 bg-light p-3 rounded">
        <div class="col-md-6">
          <div><strong class="text-muted">Customer:</strong> ${escapeHtml(s.Customer_Name)}</div>
          <div><strong class="text-muted">Phone:</strong> ${escapeHtml(s.Customer_Phone)}</div>
          <div><strong class="text-muted">Email:</strong> ${escapeHtml(s.Customer_Email || 'None')}</div>
        </div>
        <div class="col-md-6 text-md-end">
          <div><strong class="text-muted">Invoice Date:</strong> ${formatDateTime(s.Sale_Date)}</div>
          <div class="mt-2"><span class="badge bg-primary fs-6">Grand Total: ${formatCurrency(s.Total_Amount)}</span></div>
        </div>
      </div>

      <h6 class="fw-bold mb-2">Line Items (${s.items.length})</h6>
      <div class="table-responsive">
        <table class="table table-bordered table-sm align-middle">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Category</th>
              <th class="text-center">Quantity</th>
              <th class="text-end">Unit Price</th>
              <th class="text-end">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${s.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="fw-semibold">${escapeHtml(item.Product_Name)}</td>
                <td><span class="badge bg-light text-dark">${escapeHtml(item.Category_Name)}</span></td>
                <td class="text-center fw-bold">${item.Quantity}</td>
                <td class="text-end">${formatCurrency(item.Unit_Price)}</td>
                <td class="text-end fw-bold text-primary">${formatCurrency(item.Line_Total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="table-light fw-bold">
              <td colspan="5" class="text-end">Grand Total:</td>
              <td class="text-end text-primary fs-6">${formatCurrency(s.Total_Amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    invoiceModal.show();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 8. Low Stock View
// ----------------------------------------------------------------------------
async function loadLowStock() {
  try {
    const res = await API.getLowStockProducts();
    const tbody = document.getElementById('lowstock-table-tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-success py-4"><i class="bi bi-check-circle-fill"></i> All products have adequate stock levels!</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(p => `
      <tr>
        <td><span class="text-muted fw-bold">#${p.Product_ID}</span></td>
        <td class="fw-bold text-dark">${escapeHtml(p.Product_Name)}</td>
        <td><span class="badge bg-light text-dark border">${escapeHtml(p.Category_Name)}</span></td>
        <td>${formatCurrency(p.Price)}</td>
        <td><span class="badge bg-danger fs-6">${p.Stock_Quantity}</span></td>
        <td class="fw-semibold">${p.Reorder_Level}</td>
        <td><span class="fw-bold text-danger">+${p.Reorder_Deficit} units</span></td>
        <td><span class="badge-low-stock">Action Required</span></td>
        <td class="text-end">
          <button class="btn btn-outline-success btn-sm" onclick="openNewPurchaseModal()">
            <i class="bi bi-cart-plus"></i> Reorder
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading low stock: ' + error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// 9. SQL Reports (Views & Aggregates)
// ----------------------------------------------------------------------------
async function loadReports() {
  try {
    // In our backend, Category has product counts and Product has stock valuations.
    // Let's calculate category stock valuation directly from state.categories & state.products
    const tbody = document.getElementById('report-valuation-tbody');
    const catMap = new Map();

    state.categories.forEach(c => {
      catMap.set(c.Category_ID, {
        name: c.Category_Name,
        totalProducts: 0,
        totalUnits: 0,
        valuation: 0
      });
    });

    state.products.forEach(p => {
      const entry = catMap.get(p.Category_ID);
      if (entry) {
        entry.totalProducts++;
        entry.totalUnits += p.Stock_Quantity;
        entry.valuation += (p.Stock_Quantity * p.Price);
      }
    });

    tbody.innerHTML = Array.from(catMap.entries()).map(([id, info]) => `
      <tr>
        <td><span class="text-muted fw-bold">#${id}</span></td>
        <td class="fw-bold">${escapeHtml(info.name)}</td>
        <td><span class="badge bg-light text-dark border">${info.totalProducts} items</span></td>
        <td class="fw-semibold">${info.totalUnits.toLocaleString()} units</td>
        <td class="fw-bold text-primary">${formatCurrency(info.valuation)}</td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error generating reports: ' + error.message, 'danger');
  }
}

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toastId = 'toast-' + Date.now();
  const bgClass = type === 'danger' ? 'bg-danger text-white' :
                  type === 'warning' ? 'bg-warning text-dark' :
                  type === 'info' ? 'bg-info text-white' : 'bg-success text-white';

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bgClass} border-0 shadow`;
  toastEl.id = toastId;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body fw-semibold">
        ${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}
