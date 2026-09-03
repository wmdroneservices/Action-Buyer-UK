/* Shared four-dashboard staff navigation.
   Main Dashboard → Research & Pricing | Purchasing | Sales | Customers */
(function () {
  'use strict';

  const dashboards = {
    research: 'admin-research-pricing.html',
    purchasing: 'admin-purchasing.html',
    sales: 'admin-sales-dashboard.html',
    customers: 'admin-customers.html'
  };

  const groups = {
    research: new Set([
      'admin-research-pricing.html',
      'admin-catalog.html',
      'admin-catalog-control.html',
      'admin-automatic-pricing.html',
      'admin-ai-research.html'
    ]),
    purchasing: new Set([
      'admin-purchasing.html',
      'admin-valuations.html',
      'admin-sales.html',
      'admin-sale.html',
      'admin-quote.html',
      'admin-item-review.html'
    ]),
    sales: new Set([
      'admin-sales-dashboard.html',
      'inventory.html',
      'inventory-add.html',
      'inventory-detail.html',
      'inventory-ready.html',
      'inventory-testing.html',
      'inventory-sales.html',
      'active-sales-listings.html',
      'sold-items.html',
      'returns.html',
      'return-database.html',
      'inventory-finance.html',
      'listing-readiness.html',
      'sales-workbench.html',
      'sales-pricing-guide.html'
    ]),
    customers: new Set([
      'admin-customers.html',
      'admin-customer-details.html'
    ])
  };

  const links = {
    research: [
      ['admin-research-pricing.html', 'RESEARCH & PRICING'],
      ['admin-catalog.html', 'QUOTE CATALOGUE'],
      ['admin-automatic-pricing.html', 'AUTOMATIC PRICING'],
      ['admin-ai-research.html', 'AI RESEARCH'],
      ['admin-catalog-control.html', 'CATALOGUE CONTROL']
    ],
    purchasing: [
      ['admin-purchasing.html', 'PURCHASING DASHBOARD'],
      ['admin-valuations.html', 'VALUATIONS'],
      ['sales-pricing-guide.html?from=purchasing', 'QUOTE CATALOGUE / MARKET CHECK']
    ],
    sales: [
      ['admin-sales-dashboard.html', 'SALES DASHBOARD'],
      ['inventory.html', 'INVENTORY'],
      ['inventory-sales.html', 'PRE-SALE / CHANNELS'],
      ['active-sales-listings.html', 'ACTIVE LISTINGS'],
      ['sold-items.html', 'SOLD ITEMS'],
      ['returns.html', 'RETURNS'],
      ['return-database.html', 'RETURN DATABASE'],
      ['inventory-finance.html', 'PROFIT & LOSS'],
      ['sales-pricing-guide.html', 'QUOTE CATALOGUE / MARKET CHECK']
    ],
    customers: [
      ['admin-customers.html', 'CUSTOMER DASHBOARD']
    ]
  };

  const backLabels = {
    research: 'BACK TO RESEARCH & PRICING',
    purchasing: 'BACK TO PURCHASING',
    sales: 'BACK TO SALES',
    customers: 'BACK TO CUSTOMERS'
  };

  function currentPage() {
    return (location.pathname.split('/').pop() || 'admin.html').toLowerCase();
  }

  function mode(page) {
    if (page === 'sales-pricing-guide.html' && new URLSearchParams(location.search).get('from') === 'purchasing') return 'purchasing';
    for (const [name, pages] of Object.entries(groups)) {
      if (pages.has(page)) return name;
    }
    return null;
  }

  function makeNav(items, current) {
    const ul = document.createElement('ul');
    ul.className = 'nav-list staff-workflow-nav';

    items.forEach(([href, label]) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (current === href.toLowerCase()) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      ul.appendChild(li);
    });

    return ul;
  }


  function cleanHeaderNavigation(section, current) {
    const accountHeader = document.querySelector('.account-header');
    if (!accountHeader) return;

    const navigationTargets = new Set([
      dashboards[section],
      ...links[section].map(([href]) => href)
    ]);

    accountHeader.querySelectorAll('a[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('?')[0].toLowerCase();
      if (href && href !== current && navigationTargets.has(href)) {
        a.remove();
      }
    });

    accountHeader.querySelectorAll('div').forEach((div) => {
      if (!div.querySelector('a,button')) return;
      if (!div.textContent.trim() && div.children.length === 0) div.remove();
    });
  }

  function addBackButton(section, current) {
    const dashboard = dashboards[section];
    if (current === dashboard) return;

    const accountHeader = document.querySelector('.account-header');
    if (!accountHeader || accountHeader.querySelector('.staff-dashboard-back')) return;

    const actions = accountHeader.querySelector(':scope > div:last-child') || accountHeader;
    const back = document.createElement('a');
    back.href = dashboard;
    back.className = 'btn btn-secondary staff-dashboard-back';
    back.textContent = backLabels[section];

    if (actions === accountHeader) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap';
      wrap.appendChild(back);
      accountHeader.appendChild(wrap);
    } else {
      actions.prepend(back);
    }
  }

  function apply() {
    const current = currentPage();
    const section = mode(current);
    if (!section) return;

    const header = document.querySelector('header.header');
    const container = header && header.querySelector('.header-container');
    if (!container) return;

    let nav = container.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      container.appendChild(nav);
    }

    nav.setAttribute('aria-label', section + ' dashboard navigation');
    nav.replaceChildren(makeNav(links[section], current));

    container.classList.add('staff-dashboard-header', 'staff-' + section + '-header');

    const logo = container.querySelector('.logo');
    if (logo) {
      logo.href = 'admin.html';
      logo.setAttribute('aria-label', 'GearCashOut main staff dashboard');
    }

    cleanHeaderNavigation(section, current);
    addBackButton(section, current);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();