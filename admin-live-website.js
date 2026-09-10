document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth;
  const session=await auth.getSession();
  if(!session){location.href='staff-login.html';return;}
  const {data:staff,error:staffError}=await auth.supabase.from('staff_users').select('active,can_access_purchasing,can_access_sales,can_manage_staff').eq('user_id',session.user.id).maybeSingle();
  if(staffError||!staff?.active||(!staff.can_access_purchasing&&!staff.can_access_sales&&!staff.can_manage_staff)){location.href='admin.html';return;}
  const canEdit=!!staff.can_manage_staff;
  const db=auth.supabase, tree=document.getElementById('visibility-tree'), search=document.getElementById('tree-search'), count=document.getElementById('tree-count'), msg=document.getElementById('live-message');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const style={hide:'background:#fde8e8;border-color:#e7a6a6',show:'background:#e8f5e9;border-color:#9ac7a0',auto:'background:#fff8cc;border-color:#e3d27a'};
  const label=mode=>mode==='hide'?'NOT LISTED':mode==='show'?'LISTED':'AUTO';
  const modeClass=mode=>'visibility-'+(mode||'auto');
  let rows=[];
  const setMsg=(text,error=false)=>{msg.textContent=text;msg.className='form-message'+(error?' error':'');};
  const applyAccess=()=>{tree.querySelectorAll('.tree-control').forEach(el=>el.disabled=!canEdit);const notice=document.getElementById('visibility-edit-notice');if(notice)notice.hidden=canEdit;};
  async function load(){
    setMsg('Loading website visibility…');
    const pageSize=1000;let offset=0,all=[];
    while(true){
      const {data,error}=await db.rpc('staff_storefront_visibility_tree',{p_store_key:'retail',p_limit:pageSize,p_offset:offset});
      if(error){setMsg(error.message,true);return;}
      const page=data||[];all.push(...page);
      if(page.length<pageSize)break;
      offset+=pageSize;
    }
    rows=all;render();setMsg(canEdit?`Loaded ${rows.length.toLocaleString('en-GB')} catalogue products.`:`Loaded ${rows.length.toLocaleString('en-GB')} catalogue products. Read-only access.`);
  }
  function groups(){
    const manufacturers=new Map();
    rows.forEach(r=>{
      if(!r.manufacturer)return;
      if(!manufacturers.has(r.manufacturer))manufacturers.set(r.manufacturer,{name:r.manufacturer,mode:r.manufacturer_mode||'auto',categories:new Map()});
      const m=manufacturers.get(r.manufacturer);
      const category=r.category||'Uncategorised';
      if(!m.categories.has(category))m.categories.set(category,{name:category,mode:r.manufacturer_category_mode||'auto',globalMode:r.category_mode||'auto',products:[]});
      m.categories.get(category).products.push(r);
    });
    return [...manufacturers.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
  function control(scope,key,mode){
    return `<select class="tree-control" data-scope="${scope}" data-key="${esc(key)}"><option value="auto" ${mode==='auto'?'selected':''}>AUTO</option><option value="show" ${mode==='show'?'selected':''}>LISTED</option><option value="hide" ${mode==='hide'?'selected':''}>NOT LISTED</option></select>`;
  }
  function render(){
    const q=(search.value||'').trim().toLowerCase();let visibleManufacturers=0,visibleCategories=0,visibleProducts=0;
    const html=groups().map(m=>{
      const cats=[...m.categories.values()].map(c=>({...c,products:c.products.filter(p=>!q||`${m.name} ${c.name} ${p.model||''} ${p.package_name||''}`.toLowerCase().includes(q))})).filter(c=>!q||c.products.length);
      if(q&&!cats.length)return '';
      visibleManufacturers++;
      const manufacturerEffective=m.mode!=='hide';
      const categoryHtml=cats.map(c=>{
        visibleCategories++;
        const categoryEffective=manufacturerEffective&&c.mode!=='hide'&&c.globalMode!=='hide';
        const productHtml=c.products.map(p=>{visibleProducts++;const effective=categoryEffective&&(p.product_mode||'auto')!=='hide';const pm=p.product_mode||'auto';return `<div class="tree-child ${modeClass(pm)}" style="${style[pm]}"><div class="tree-row-head"><span class="tree-name tree-product"><strong>${esc(p.model||'Unnamed product')}</strong><span class="tree-count">${esc(p.package_name||'Standard Package')} · ${effective?'LISTED ON WEBSITE':'NOT LISTED ON WEBSITE'}</span></span>${control('product',p.product_id,pm)}</div></div>`;}).join('');
        const ck=`${m.name}::${c.name}`;
        return `<div class="tree-child ${modeClass(c.mode)}" style="${style[c.mode]}"><div class="tree-row-head"><button class="tree-toggle" type="button" aria-expanded="false">+</button><span class="tree-name"><strong>${esc(c.name)}</strong><span class="tree-count">${c.products.length} products · ${label(c.mode)}${c.globalMode!=='auto'?` · GLOBAL CATEGORY ${label(c.globalMode)}`:''}</span></span>${control('manufacturer_category',ck,c.mode)}</div><div class="tree-children">${productHtml||'<div class="tree-note">No matching products.</div>'}</div></div>`;
      }).join('');
      const open=q?' open':'';
      return `<div class="tree-row${open}" data-manufacturer="${esc(m.name)}" style="${style[m.mode]}"><div class="tree-row-head"><button class="tree-toggle" type="button" aria-expanded="${q?'true':'false'}">${q?'−':'+'}</button><span class="tree-name"><strong>${esc(m.name)}</strong><span class="tree-count">${m.categories.size} branches · ${label(m.mode)}</span></span>${control('manufacturer',m.name,m.mode)}</div><div class="tree-children">${categoryHtml}</div></div>`;
    }).join('');
    tree.innerHTML=html||'<p>No matching manufacturers, categories or products.</p>';
    count.textContent=`Showing ${visibleManufacturers.toLocaleString('en-GB')} manufacturers · ${visibleCategories.toLocaleString('en-GB')} categories · ${visibleProducts.toLocaleString('en-GB')} products.`;applyAccess();
  }
  async function save(scope,key,mode){if(!canEdit)return;const {error}=await db.rpc('staff_set_storefront_visibility',{p_store_key:'retail',p_scope_type:scope,p_scope_key:key,p_visibility_mode:mode});if(error){setMsg(error.message,true);await load();return;}await load();setMsg(`${scope==='manufacturer'?'Manufacturer':scope==='manufacturer_category'?'Manufacturer category':'Product'} visibility saved.`);}
  tree.addEventListener('click',e=>{const btn=e.target.closest('.tree-toggle');if(!btn)return;const row=btn.closest('.tree-row,.tree-child');if(!row)return;const open=row.classList.toggle('open');btn.textContent=open?'−':'+';btn.setAttribute('aria-expanded',open?'true':'false');});
  tree.addEventListener('change',e=>{if(!e.target.matches('.tree-control')||!canEdit)return;const select=e.target;select.disabled=true;save(select.dataset.scope,select.dataset.key,select.value);});
  search.addEventListener('input',render);
  await load();
});