/* Shared staff dashboard navigation.
   Keeps the top bar focused on the two primary staff work areas.
   Page-level workflow buttons remain contextual to the page itself. */
(function () {
  'use strict';

  function applyStaffNavigation() {
    const header = document.querySelector('header.header');
    if (!header) return;

    const container = header.querySelector('.header-container');
    if (!container) return;

    let nav = container.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      container.appendChild(nav);
    }

    nav.setAttribute('aria-label', 'Staff dashboard navigation');
    nav.innerHTML = '';

    const list = document.createElement('ul');
    list.className = 'nav-list';

    const links = [
      ['admin-purchasing.html', 'STAFF PURCHASING DASHBOARD'],
      ['admin-sales-dashboard.html', 'STAFF SALES DASHBOARD']
    ];

    const current = (window.location.pathname.split('/').pop() || 'admin.html').toLowerCase();

    links.forEach(function ([href, label]) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (current === href.toLowerCase()) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      list.appendChild(li);
    });

    nav.appendChild(list);
    container.classList.add('staff-dashboard-header');

    const logo = container.querySelector('.logo');
    if (logo) {
      logo.href = 'admin.html';
      logo.setAttribute('aria-label', 'GearCashOut Staff Dashboard');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStaffNavigation);
  } else {
    applyStaffNavigation();
  }
})();
