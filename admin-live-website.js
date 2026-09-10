document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth;
  const session=await auth.getSession();
  if(!session){location.href='staff-login.html';return;}
  const {data:staff,error:staffError}=await auth.supabase.from('staff_users').select('active,can_manage_staff').eq('user_id',session.user.id).maybeSingle();
  if(staffError||!staff?.active||!staff?.can_manage_staff){location.href='admin.html';return;}
  const db=auth.supabase;
  const msg=document.getElementById('live-message');
  const manufacturerList=document.getElementById('manufacturer-list');
  const categoryList=document.getElementById('category-list');
  const productList=document.getElementById('product-list');
  const productSearch=document.getElementById('product-search');
  const productCount=document.getElementById('product-count');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let rows=[];
  const state={manufacturers:new Map(),categories:new Map(),products:new Map()};
  const setMsg=(text,error=false)=>{msg.textContent=text;msg.className='form-message'+(error?' error':'');};
  const modeLabel=mode=>mode==='hide'?'HIDDEN':mode==='show'?'VISIBLE':'AUTO';
  const modeClass=mode=>mode==='hide'?'error':mode==='show'?'success':'';

  async function load(){
    setMsg('Loading live website controls…');
    const {data,error}=await db.rpc('staff_storefront_visibility_catalog',{p_store_key:'retail'});
    if(error){setMsg(error.message,true);return;}
    rows=data||[];
    state.manufacturers.clear();state.categories.clear();state.products.clear();
    rows.forEach(r=>{
      state.manufacturers.set(r.manufacturer,r.manufacturer_mode||'auto');
      state.categories.set(r.category,r.category_mode||'auto');
      state.products.set(r.product_id,r.product_mode||'auto');
    });
    renderManufacturers();renderCategories();renderProducts();setMsg(`Loaded ${rows.length.toLocaleString('en-GB')} catalogue products.`);
  }

  function renderManufacturers(){
    const names=[...state.manufacturers.keys()].filter(Boolean).sort((a,b)=>a.localeCompare(b));
    manufacturerList.innerHTML=names.map(name=>{
      const mode=state.manufacturers.get(name)||'auto';
      return `<label style="display:flex;align-items:center;gap:.7rem;padding:.75rem .85rem;border:1px solid #d7dce2;border-radius:8px;background:#fff;cursor:pointer"><input class="manufacturer-check" type="checkbox" data-key="${esc(name)}" ${mode!=='hide'?'checked':''}><span style="flex:1"><strong>${esc(name)}</strong><small style="display:block;color:#667085;margin-top:.2rem">${rows.filter(r=>r.manufacturer===name).length} catalogue products · ${modeLabel(mode)}</small></span></label>`;
    }).join('')||'<p>No manufacturers found.</p>';
  }

  function renderCategories(){
    const categories=[...state.categories.keys()].filter(Boolean).sort((a,b)=>a.localeCompare(b));
    categoryList.innerHTML=categories.map(category=>{
      const mode=state.categories.get(category)||'auto';
      return `<label style="display:flex;align-items:center;gap:.7rem;padding:.75rem .85rem;border:1px solid #d7dce2;border-radius:8px;background:#fff;cursor:pointer"><input class="category-check" type="checkbox" data-key="${esc(category)}" ${mode!=='hide'?'checked':''}><span style="flex:1"><strong>${esc(category)}</strong><small style="display:block;color:#667085;margin-top:.2rem">${rows.filter(r=>r.category===category).length} catalogue products · ${modeLabel(mode)}</small></span></label>`;
    }).join('')||'<p>No categories found.</p>';
  }

  function renderProducts(){
    const q=productSearch.value.trim().toLowerCase();
    const filtered=rows.filter(r=>!q||`${r.manufacturer} ${r.model} ${r.package_name} ${r.category}`.toLowerCase().includes(q));
    productCount.textContent=`Showing ${filtered.length.toLocaleString('en-GB')} of ${rows.length.toLocaleString('en-GB')} products.`;
    productList.innerHTML=filtered.slice(0,500).map(r=>{
      const mode=state.products.get(r.product_id)||'auto';
      const effective=r.manufacturer_mode!=='hide'&&r.category_mode!=='hide'&&mode!=='hide';
      return `<article style="display:grid;grid-template-columns:minmax(0,1fr) 150px minmax(90px,.35fr);gap:.75rem;align-items:center;border:1px solid #d7dce2;border-radius:8px;padding:.7rem .85rem;background:#fff"><div><strong>${esc(r.manufacturer)} ${esc(r.model)}</strong><small style="display:block;color:#667085;margin-top:.2rem">${esc(r.package_name||'Standard Package')} · ${esc(r.category)} · ${effective?'LIVE':'HIDDEN BY PARENT/PRODUCT'}</small></div><select class="product-mode" data-key="${esc(r.product_id)}"><option value="auto" ${mode==='auto'?'selected':''}>AUTO</option><option value="show" ${mode==='show'?'selected':''}>SHOW</option><option value="hide" ${mode==='hide'?'selected':''}>HIDE</option></select><span class="notice ${modeClass(mode)}" style="margin:0;text-align:center">${modeLabel(mode)}</span></article>`;
    }).join('')||'<p>No matching products.</p>';
    if(filtered.length>500) productCount.textContent+=` Showing the first 500 matches; search further to manage additional products.`;
  }

  async function setVisibility(scope,key,mode){
    const {error}=await db.rpc('staff_set_storefront_visibility',{p_store_key:'retail',p_scope_type:scope,p_scope_key:key,p_visibility_mode:mode});
    if(error){setMsg(error.message,true);return false;}
    return true;
  }

  document.getElementById('show-selected-manufacturers').addEventListener('click',async()=>{
    const selected=[...manufacturerList.querySelectorAll('.manufacturer-check:checked')].map(x=>x.dataset.key);
    if(!selected.length){setMsg('Select at least one manufacturer before using SHOW ONLY SELECTED MANUFACTURERS.',true);return;}
    setMsg('Applying manufacturer selection…');
    const {error}=await db.rpc('staff_set_storefront_scope_mode',{p_store_key:'retail',p_scope_type:'manufacturer',p_selected_keys:selected,p_mode:'show_only'});
    if(error){setMsg(error.message,true);return;}
    await load();setMsg(`Website manufacturer visibility set to ${selected.length} selected manufacturer${selected.length===1?'':'s'}.`);
  });

  document.getElementById('reset-manufacturers').addEventListener('click',async()=>{
    if(!confirm('Reset all manufacturer visibility overrides to AUTO?')) return;
    setMsg('Resetting manufacturers…');
    const {error}=await db.rpc('staff_set_storefront_scope_mode',{p_store_key:'retail',p_scope_type:'manufacturer',p_selected_keys:[],p_mode:'reset_auto'});
    if(error){setMsg(error.message,true);return;} await load();
  });

  document.getElementById('show-selected-categories').addEventListener('click',async()=>{
    const selected=[...categoryList.querySelectorAll('.category-check:checked')].map(x=>x.dataset.key);
    if(!selected.length){setMsg('Select at least one category before using SHOW ONLY SELECTED CATEGORIES.',true);return;}
    setMsg('Applying category selection…');
    const {error}=await db.rpc('staff_set_storefront_scope_mode',{p_store_key:'retail',p_scope_type:'category',p_selected_keys:selected,p_mode:'show_only'});
    if(error){setMsg(error.message,true);return;}
    await load();setMsg(`Website category visibility set to ${selected.length} selected categor${selected.length===1?'y':'ies'}.`);
  });

  document.getElementById('reset-categories').addEventListener('click',async()=>{
    if(!confirm('Reset all category visibility overrides to AUTO?')) return;
    setMsg('Resetting categories…');
    const {error}=await db.rpc('staff_set_storefront_scope_mode',{p_store_key:'retail',p_scope_type:'category',p_selected_keys:[],p_mode:'reset_auto'});
    if(error){setMsg(error.message,true);return;} await load();
  });

  manufacturerList.addEventListener('change',e=>{if(e.target.matches('.manufacturer-check')) state.manufacturers.set(e.target.dataset.key,e.target.checked?'show':'hide');});
  categoryList.addEventListener('change',e=>{if(e.target.matches('.category-check')) state.categories.set(e.target.dataset.key,e.target.checked?'show':'hide');});
  productList.addEventListener('change',async e=>{
    if(!e.target.matches('.product-mode')) return;
    const mode=e.target.value,key=e.target.dataset.key;
    e.target.disabled=true;setMsg('Saving product visibility…');
    if(await setVisibility('product',key,mode)){state.products.set(key,mode);renderProducts();setMsg('Product visibility saved.');}
    e.target.disabled=false;
  });
  productSearch.addEventListener('input',renderProducts);
  await load();
});