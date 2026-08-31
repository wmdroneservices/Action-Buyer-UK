/* GearCashOut: read-only staff dashboard catalogue counters.
   This module only reads quote_catalog_products. It does not alter quote values,
   catalogue records, valuation logic, or customer-facing behaviour. */
(function(){
  'use strict';

  const PAGE_SIZE = 1000;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));

  async function loadCatalogueRows(supabase){
    const rows = [];
    for(let from = 0; ; from += PAGE_SIZE){
      const { data, error } = await supabase
        .from('quote_catalog_products')
        .select('manufacturer,category,active')
        .range(from, from + PAGE_SIZE - 1);
      if(error) throw error;
      rows.push(...(data || []));
      if(!data || data.length < PAGE_SIZE) break;
    }
    return rows;
  }

  function broadType(category){
    const c = String(category || '').trim().toLowerCase();
    if(c.includes('drone')) return 'Drones';
    if(c.includes('camera') || c === 'camcorder') return 'Cameras';
    if(c.includes('lens')) return 'Lenses';
    if(c.includes('audio')) return 'Audio';
    if(c.includes('light')) return 'Lighting';
    if(c.includes('gimbal') || c.includes('stabil')) return 'Stabilisation';
    if(c.includes('tripod') || c.includes('support')) return 'Support';
    if(c.includes('power') || c.includes('battery')) return 'Power';
    if(c.includes('transmission') || c.includes('video equipment')) return 'Video / Transmission';
    if(c.includes('accessor') || c.includes('bag') || c.includes('case') || c.includes('controller') || c.includes('goggle')) return 'Accessories';
    return 'Other';
  }

  function render(rows){
    const host = document.getElementById('catalog-counts');
    if(!host) return;

    const total = rows.length;
    const active = rows.filter(r => r.active === true).length;
    const inactive = total - active;
    const types = new Map();
    const manufacturers = new Map();

    rows.forEach(row => {
      const type = broadType(row.category);
      types.set(type, (types.get(type) || 0) + 1);
      const manufacturer = String(row.manufacturer || 'Unspecified').trim() || 'Unspecified';
      manufacturers.set(manufacturer, (manufacturers.get(manufacturer) || 0) + 1);
    });

    const typeOrder = ['Drones','Cameras','Lenses','Audio','Lighting','Stabilisation','Support','Power','Video / Transmission','Accessories','Other'];
    const typeRows = typeOrder.filter(type => types.has(type)).map(type => [type, types.get(type)]);
    const manufacturerRows = [...manufacturers.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    host.innerHTML = `
      <div class="catalog-counts-grid">
        <div class="catalog-count-card catalog-count-total"><span>Total products</span><strong>${total.toLocaleString('en-GB')}</strong></div>
        <div class="catalog-count-card"><span>Active</span><strong>${active.toLocaleString('en-GB')}</strong></div>
        <div class="catalog-count-card"><span>Inactive</span><strong>${inactive.toLocaleString('en-GB')}</strong></div>
      </div>
      <div class="catalog-counts-columns">
        <div class="catalog-count-panel">
          <h3>Products by type</h3>
          <div class="catalog-count-list">${typeRows.map(([name,count]) => `<div><span>${esc(name)}</span><strong>${count.toLocaleString('en-GB')}</strong></div>`).join('')}</div>
        </div>
        <div class="catalog-count-panel">
          <h3>Products by manufacturer</h3>
          <div class="catalog-count-list catalog-count-manufacturers">${manufacturerRows.map(([name,count]) => `<div><span>${esc(name)}</span><strong>${count.toLocaleString('en-GB')}</strong></div>`).join('')}</div>
        </div>
      </div>`;
  }

  async function init(){
    const host = document.getElementById('catalog-counts');
    if(!host) return;
    const auth = window.actionBuyerAuth;
    if(!auth) return;
    const session = await auth.getSession();
    if(!session) return;
    try{
      const rows = await loadCatalogueRows(auth.supabase);
      render(rows);
    }catch(error){
      host.innerHTML = `<div class="form-message error">Could not load catalogue counts: ${esc(error?.message || 'Unknown error')}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
