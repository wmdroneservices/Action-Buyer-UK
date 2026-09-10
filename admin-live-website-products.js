document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth;
  const session=await auth.getSession();
  if(!session){location.href='staff-login.html';return;}
  const {data:staff,error:staffError}=await auth.supabase.from('staff_users').select('active,can_manage_staff').eq('user_id',session.user.id).maybeSingle();
  if(staffError||!staff?.active||!staff?.can_manage_staff){location.href='admin.html';return;}
  const db=auth.supabase,summary=document.getElementById('live-summary'),grid=document.getElementById('live-products'),search=document.getElementById('live-search'),category=document.getElementById('live-category'),manufacturer=document.getElementById('live-manufacturer');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let rows=[];
  async function load(){
    summary.textContent='Loading live website products…';
    const {data,error}=await db.rpc('public_storefront_stock',{p_store_key:'retail',p_category:null,p_manufacturer:null,p_model:null});
    if(error){summary.textContent=error.message;summary.className='form-message error';return;}
    rows=data||[];
    const cats=[...new Set(rows.map(r=>r.category).filter(Boolean))].sort();
    const mans=[...new Set(rows.map(r=>r.manufacturer).filter(Boolean))].sort();
    category.innerHTML='<option value="">All categories</option>'+cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    manufacturer.innerHTML='<option value="">All manufacturers</option>'+mans.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    render();
  }
  function render(){
    const q=search.value.trim().toLowerCase(),cat=category.value,man=manufacturer.value;
    const filtered=rows.filter(r=>(!q||`${r.manufacturer} ${r.model} ${r.package_name} ${r.listing_title}`.toLowerCase().includes(q))&&(!cat||r.category===cat)&&(!man||r.manufacturer===man));
    summary.textContent=`${filtered.length.toLocaleString('en-GB')} live website listing${filtered.length===1?'':'s'} shown. These are published WEBSITE stock after manufacturer/category/product visibility rules have been applied.`;
    grid.innerHTML=filtered.map(r=>`<article style="border:1px solid #d7dce2;border-radius:10px;padding:1rem;background:#fff"><p class="section-kicker">LIVE ON WEBSITE</p><h3 style="margin:.2rem 0">${esc(r.listing_title||`${r.manufacturer} ${r.model}`)}</h3><p style="margin:.35rem 0;color:#667085">${esc(r.manufacturer)} · ${esc(r.model)} · ${esc(r.package_name||'Standard Package')}</p><p style="margin:.35rem 0"><strong>${Number(r.asking_price||0).toLocaleString('en-GB',{style:'currency',currency:'GBP'})}</strong></p><p style="margin:.35rem 0;font-size:.85rem;color:#667085">Published ${r.published_at?new Date(r.published_at).toLocaleString('en-GB'): 'date not recorded'}</p><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(r.listing_id)}">OPEN PRODUCT WORKBENCH</a></article>`).join('')||'<p>No currently live website products match these filters.</p>';
  }
  search.addEventListener('input',render);category.addEventListener('change',render);manufacturer.addEventListener('change',render);
  await load();
});