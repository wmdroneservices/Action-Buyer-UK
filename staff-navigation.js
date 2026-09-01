/* Shared staff navigation.
   The purchasing and sales areas intentionally have different top-bar menus. */
(function () {
  'use strict';

  const purchasingPages = new Set([
    'admin-purchasing.html',
    'admin-valuations.html',
    'admin-sales.html',
    'admin-catalog.html',
    'admin-catalog-control.html',
    'admin-customers.html',
    'inventory-add.html'
  ]);

  const salesPages = new Set([
    'admin-sales-dashboard.html',
    'inventory-sales.html',
    'active-sales-listings.html',
    'sold-items.html',
    'returns.html',
    'return-database.html',
    'inventory-finance.html',
    'listing-readiness.html',
    'sales-workbench.html'
  ]);

  const purchasingLinks = [
    ['admin-purchasing.html', 'PURCHASING DASHBOARD'],
    ['admin-valuations.html', 'VALUATIONS'],
    ['admin-sales.html', 'PURCHASE PIPELINE'],
    ['inventory.html', 'INVENTORY'],
    ['admin-catalog.html', 'QUOTE CATALOGUE'],
    ['admin-catalog-control.html', 'CATALOGUE CONTROL'],
    ['admin-customers.html', 'CUSTOMERS']
  ];

  const salesLinks = [
    ['admin-sales-dashboard.html', 'SALES DASHBOARD'],
    ['inventory.html', 'INVENTORY'],
    ['inventory-sales.html', 'PRE-SALE / CHANNELS'],
    ['active-sales-listings.html', 'ACTIVE LISTINGS'],
    ['sold-items.html', 'SOLD ITEMS'],
    ['returns.html', 'RETURNS'],
    ['return-database.html', 'RETURN DATABASE'],
    ['inventory-finance.html', 'PROFIT & LOSS']
  ];

  function getMode(current) {
    if (current === 'admin-purchasing.html') return 'purchasing';
    if (current === 'admin-sales-dashboard.html') return 'sales';
    if (purchasingPages.has(current)) return 'purchasing';
    if (salesPages.has(current)) return 'sales';
    return null;
  }

  function applyStaffNavigation() {
    const header = document.querySelector('header.header');
    if (!header) return;

    const container = header.querySelector('.header-container');
    if (!container) return;

    const current = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const mode = getMode(current);
    if (!mode) return;

    let nav = container.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      container.appendChild(nav);
    }

    nav.setAttribute('aria-label', mode === 'purchasing'
      ? 'Purchasing navigation'
      : 'Sales navigation');

    const links = mode === 'purchasing' ? purchasingLinks : salesLinks;
    const list = document.createElement('ul');
    list.className = 'nav-list staff-workflow-nav';

    links.forEach(function ([href, label]) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (current === href.toLowerCase()) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      list.appendChild(li);
    });

    nav.replaceChildren(list);
    container.classList.add('staff-dashboard-header', mode === 'purchasing'
      ? 'staff-purchasing-header'
      : 'staff-sales-header');

    const logo = container.querySelector('.logo');
    if (logo) {
      logo.href = mode === 'purchasing'
        ? 'admin-purchasing.html'
        : 'admin-sales-dashboard.html';
      logo.setAttribute('aria-label', mode === 'purchasing'
        ? 'GearCashOut Purchasing Dashboard'
        : 'GearCashOut Sales Dashboard');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStaffNavigation);
  } else {
    applyStaffNavigation();
  }
})();