/* Shared three-stage staff navigation: Research & Pricing → Purchasing → Sales. */
(function () {
  'use strict';

  const researchPages = new Set([
    'admin-research-pricing.html','admin-catalog.html','admin-catalog-control.html',
    'admin-automatic-pricing.html','admin-ai-research.html'
  ]);
  const purchasingPages = new Set([
    'admin-purchasing.html','admin-valuations.html','admin-sales.html','admin-customers.html'
  ]);
  const salesPages = new Set([
    'admin-sales-dashboard.html','inventory.html','inventory-sales.html','active-sales-listings.html',
    'sold-items.html','returns.html','return-database.html','inventory-finance.html',
    'listing-readiness.html','sales-workbench.html','sales-pricing-guide.html'
  ]);

  const researchLinks = [
    ['admin-research-pricing.html','RESEARCH & PRICING'],
    ['admin-catalog.html','QUOTE CATALOGUE'],
    ['admin-catalog-control.html','CATALOGUE CONTROL'],
    ['admin-automatic-pricing.html','AUTOMATIC PRICING'],
    ['admin-ai-research.html','AI RESEARCH'],
    ['admin-purchasing.html','PURCHASING'],
    ['admin-sales-dashboard.html','SALES']
  ];
  const purchasingLinks = [
    ['admin-purchasing.html','PURCHASING DASHBOARD'],
    ['admin-valuations.html','VALUATIONS'],
    ['admin-sales.html','PURCHASE PIPELINE'],
    ['admin-customers.html','CUSTOMERS'],
    ['admin-catalog.html','QUOTE CATALOGUE'],
    ['admin-research-pricing.html','RESEARCH & PRICING'],
    ['admin-sales-dashboard.html','SALES DASHBOARD']
  ];
  const salesLinks = [
    ['admin-sales-dashboard.html','SALES DASHBOARD'],
    ['inventory.html','INVENTORY'],
    ['inventory-sales.html','PRE-SALE / CHANNELS'],
    ['active-sales-listings.html','ACTIVE LISTINGS'],
    ['sold-items.html','SOLD ITEMS'],
    ['returns.html','RETURNS'],
    ['return-database.html','RETURN DATABASE'],
    ['inventory-finance.html','PROFIT & LOSS'],
    ['sales-pricing-guide.html','QUOTE CATALOGUE / MARKET CHECK']
  ];

  function mode(current){
    if(researchPages.has(current))return 'research';
    if(purchasingPages.has(current))return 'purchasing';
    if(salesPages.has(current))return 'sales';
    return null;
  }
  function apply(){
    const header=document.querySelector('header.header');
    const container=header?.querySelector('.header-container');
    if(!container)return;
    const current=(location.pathname.split('/').pop()||'').toLowerCase();
    const m=mode(current); if(!m)return;
    const links=m==='research'?researchLinks:m==='purchasing'?purchasingLinks:salesLinks;
    let nav=container.querySelector('nav'); if(!nav){nav=document.createElement('nav');container.appendChild(nav);}
    nav.setAttribute('aria-label',m+' dashboard navigation');
    const ul=document.createElement('ul');ul.className='nav-list staff-workflow-nav';
    links.forEach(([href,label])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=href;a.textContent=label;if(current===href.toLowerCase())a.setAttribute('aria-current','page');li.appendChild(a);ul.appendChild(li);});
    nav.replaceChildren(ul);
    container.classList.add('staff-dashboard-header','staff-'+m+'-header');
    const logo=container.querySelector('.logo');
    if(logo){const home=m==='research'?'admin-research-pricing.html':m==='purchasing'?'admin-purchasing.html':'admin-sales-dashboard.html';logo.href=home;logo.setAttribute('aria-label','GearCashOut '+m+' dashboard');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();