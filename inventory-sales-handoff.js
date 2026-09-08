document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const root = document.getElementById('asset-detail');
  if (!auth || !root) return;
  const session = await auth.getSession();
  if (!session) return;
  const db = auth.supabase;
  const { data: staff } = await db.from('staff_users').select('user_id,active').eq('user_id', session.user.id).maybeSingle();
  if (!staff?.active) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const handoffStatuses = new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);

  const { data: asset } = await db.from('inventory_assets').select('*').eq('id', id).maybeSingle();
  if (!asset || !handoffStatuses.has(asset.status)) return;

  const [testingRes,evidenceRes,itemSalesRes,catalogSalesRes,quoteRes] = await Promise.all([
    db.from('inventory_testing').select('*').eq('asset_id',id).order('created_at',{ascending:false}),
    db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true}),
    db.from('inventory_sales_content').select('*').eq('asset_id',id).maybeSingle(),
    asset.catalog_product_id ? db.from('catalog_sales_content').select('*').eq('catalog_product_id',asset.catalog_product_id).maybeSingle() : Promise.resolve({data:null}),
    asset.source_quote_item_id ? db.from('quote_items').select('manufacturer,model,package,item_data').eq('id',asset.source_quote_item_id).maybeSingle() : Promise.resolve({data:null})
  ]);

  const testingRows = testingRes.data || [];
  const evidenceRows = evidenceRes.data || [];
  const itemSales = itemSalesRes.data || {};
  const catalogSales = catalogSalesRes.data || {};
  const quoteItem = quoteRes.data || null;
  const inspection = testingRows.find(x => x.stage === 'inspection') || null;
  const testing = testingRows.find(x => x.stage === 'testing') || null;
  const itemData = quoteItem?.item_data && typeof quoteItem.item_data === 'object' ? quoteItem.item_data : {};
  const customerPhotoPaths = [...(itemData.photos || [])].map(x => typeof x === 'string' ? x : x?.path).filter(Boolean);

  async function signedMap(rows, pathKey='file_url') {
    const paths = rows.map(x => x[pathKey]).filter(Boolean);
    if (!paths.length) return [];
    const { data } = await db.storage.from('quote-photos').createSignedUrls(paths,3600);
    const byPath = new Map((data || []).filter(x => x.signedUrl).map(x => [x.path,x.signedUrl]));
    return rows.map(x => ({...x, signedUrl:byPath.get(x[pathKey]) || ''})).filter(x => x.signedUrl);
  }

  const customerPhotos = await signedMap(customerPhotoPaths.map(file_url => ({file_url})));
  const staffPhotos = await signedMap(evidenceRows);

  const customerHtml = customerPhotos.length ? customerPhotos.map(p => '<a href="'+esc(p.signedUrl)+'" target="_blank" rel="noopener"><img src="'+esc(p.signedUrl)+'" alt="Customer supplied photograph" style="width:100%;height:140px;object-fit:cover;border-radius:8px"></a>').join('') : '<p>No customer supplied photographs available.</p>';
  const staffHtml = staffPhotos.length ? staffPhotos.map(p => {
    const isHero = itemSales.hero_image_url === p.file_url;
    return '<div class="notice" style="padding:.45rem"><a href="'+esc(p.signedUrl)+'" target="_blank" rel="noopener"><img src="'+esc(p.signedUrl)+'" alt="Staff photograph" style="width:100%;height:140px;object-fit:cover;border-radius:8px"></a><div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem"><button class="btn btn-secondary" type="button" data-set-hero="'+esc(p.file_url)+'">'+(isHero?'ITEM HERO SELECTED':'USE AS ITEM HERO')+'</button><button class="btn btn-secondary" type="button" data-remove-photo="'+esc(p.id)+'" data-photo-path="'+esc(p.file_url)+'">REMOVE</button></div></div>';
  }).join('') : '<p>No staff photographs yet.</p>';

  root.innerHTML = [
    '<div class="valuation-card">',
      '<div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">',
        '<div><p class="section-kicker" style="display:inline-block;color:#166534;background:#ecfdf3;border:1px solid #16a34a;padding:.4rem .7rem;border-radius:4px;font-weight:900;letter-spacing:.08em">INSPECTION COMPLETE · SENT TO SALES</p>',
        '<h2>'+esc([asset.manufacturer,asset.model].filter(Boolean).join(' ') || 'Unnamed asset')+'</h2>',
        '<p>Asset '+esc(asset.asset_reference)+' · Transaction '+esc(asset.transaction_number || 'Not recorded')+'</p>',
        '<p>Inspection and repair/testing history are retained as the permanent receiving record. Product details, photographs, sales presentation and channels are managed on this one page.</p></div>',
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-secondary" href="inventory.html">BACK TO INVENTORY</a></div>',
      '</div>',
    '</div>',

    '<section class="valuation-card" style="margin-top:1rem"><h2>Inspection history</h2>',
      '<div class="notice"><strong>Inspection result:</strong> '+esc(inspection?.result === 'Requires Attention' ? 'Requires Repair' : inspection?.result || 'Not recorded')+'<br><strong>Technical result:</strong> '+esc(testing?.result || 'Not recorded')+'<br><strong>Condition:</strong> '+esc(asset.condition_grade || 'Not recorded')+'<br><strong>Serial:</strong> '+esc(asset.serial_number || 'Not recorded')+'<br><strong>Final package:</strong> '+esc(asset.final_package_contents || 'Not recorded')+'</div>',
      '<p style="margin-top:.75rem">The completed inspection is no longer presented as an active workflow. Use the edit control only to correct the inspection report.</p>',
      '<button id="edit-inspection-report" class="btn btn-secondary" type="button">EDIT INSPECTION REPORT</button>',
      '<div id="inspection-edit-note" class="form-message" style="margin-top:.6rem"></div>',
    '</section>',

    '<section class="valuation-card" style="margin-top:1rem"><p class="section-kicker">CATALOGUE CONTENT</p><h2>Manufacturer & product description</h2>',
      '<p>Reusable catalogue-level content. This is where manufacturer production information, researched product descriptions and the catalogue hero image belong.</p>',
      '<form id="catalog-sales-content-form" class="auth-form">',
        '<label>Manufacturer / product description<textarea name="product_description" rows="8" placeholder="Add the researched manufacturer or production description.">'+esc(catalogSales.product_description || '')+'</textarea></label>',
        '<label>Catalogue hero image URL<input name="hero_image_url" value="'+esc(catalogSales.hero_image_url || '')+'" placeholder="Primary catalogue product image URL"></label>',
        '<label>Manufacturer image URL<input name="manufacturer_image_url" value="'+esc(catalogSales.manufacturer_image_url || '')+'" placeholder="Official/manufacturer image URL if used"></label>',
        '<label>Source attribution<textarea name="source_attribution" rows="3" placeholder="Record the official source or attribution.">'+esc(catalogSales.source_attribution || '')+'</textarea></label>',
        '<button class="btn btn-primary" type="submit" '+(!asset.catalog_product_id?'disabled':'')+'>SAVE CATALOGUE CONTENT</button><p id="catalog-sales-message" class="form-message" aria-live="polite"></p>',
      '</form>',
      (!asset.catalog_product_id ? '<p class="form-message error">This asset is not linked to a catalogue product, so reusable catalogue content cannot yet be saved.</p>' : ''),
    '</section>',

    '<section class="valuation-card" style="margin-top:1rem"><p class="section-kicker">THIS PHYSICAL ITEM</p><h2>Condition & listing presentation</h2>',
      '<form id="item-sales-content-form" class="auth-form">',
        '<label>Condition description<textarea name="condition_description" rows="6" placeholder="Describe the actual condition of this physical item.">'+esc(itemSales.condition_description || '')+'</textarea></label>',
        '<label>Listing notes<textarea name="listing_notes" rows="4" placeholder="Staff-only listing notes and preparation notes.">'+esc(itemSales.listing_notes || '')+'</textarea></label>',
        '<label>Individual item hero image URL<input name="hero_image_url" value="'+esc(itemSales.hero_image_url || '')+'" placeholder="Select a staff photo below or enter the image path"></label>',
        '<button class="btn btn-primary" type="submit">SAVE ITEM SALES CONTENT</button><p id="item-sales-message" class="form-message" aria-live="polite"></p>',
      '</form>',
    '</section>',

    '<section class="valuation-card" style="margin-top:1rem"><h2>Customer supplied photographs</h2><p>Original customer evidence retained separately from staff resale photography.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">'+customerHtml+'</div></section>',

    '<section class="valuation-card" style="margin-top:1rem"><h2>Staff photographs & hero image</h2><p>Add, remove and manage staff photographs. Select one as the primary hero image for this physical item.</p>',
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:1rem">'+staffHtml+'</div>',
      '<form id="handoff-photo-form" class="auth-form"><label>Add photographs<input id="handoff-photos" type="file" accept="image/*" capture="environment" multiple></label><button class="btn btn-secondary" type="submit">UPLOAD PHOTOGRAPHS</button><p id="handoff-photo-message" class="form-message" aria-live="polite"></p></form>',
    '</section>'
  ].join('');

  async function saveCatalog(form) {
    const fd = new FormData(form);
    const payload = {
      catalog_product_id: asset.catalog_product_id,
      product_description: fd.get('product_description') || null,
      hero_image_url: fd.get('hero_image_url') || null,
      manufacturer_image_url: fd.get('manufacturer_image_url') || null,
      source_attribution: fd.get('source_attribution') || null,
      created_by: session.user.id,
      updated_at: new Date().toISOString()
    };
    return db.from('catalog_sales_content').upsert(payload,{onConflict:'catalog_product_id'});
  }

  async function saveItem(form, heroOverride=null) {
    const fd = new FormData(form);
    const payload = {
      asset_id:id,
      condition_description:fd.get('condition_description') || null,
      listing_notes:fd.get('listing_notes') || null,
      hero_image_url:heroOverride ?? (fd.get('hero_image_url') || null),
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    };
    return db.from('inventory_sales_content').upsert(payload,{onConflict:'asset_id'});
  }

  root.querySelector('#catalog-sales-content-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const message=root.querySelector('#catalog-sales-message');
    message.textContent='Saving…';
    const {error}=await saveCatalog(e.currentTarget);
    message.textContent=error ? error.message : 'Catalogue content saved.';
    message.className='form-message'+(error?' error':'');
  });

  root.querySelector('#item-sales-content-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const message=root.querySelector('#item-sales-message');
    message.textContent='Saving…';
    const {error}=await saveItem(e.currentTarget);
    message.textContent=error ? error.message : 'Item sales content saved.';
    message.className='form-message'+(error?' error':'');
  });

  root.querySelectorAll('[data-set-hero]').forEach(btn => btn.addEventListener('click', async () => {
    const form=root.querySelector('#item-sales-content-form');
    form.querySelector('[name="hero_image_url"]').value=btn.dataset.setHero;
    const {error}=await saveItem(form,btn.dataset.setHero);
    if (error) { alert(error.message); return; }
    root.querySelector('#item-sales-message').textContent='Item hero image selected and saved.';
    location.reload();
  }));

  root.querySelectorAll('[data-remove-photo]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Remove this staff photograph from the item record?')) return;
    const evidenceId=btn.dataset.removePhoto;
    const path=btn.dataset.photoPath;
    const {error: rowError}=await db.from('inventory_evidence').delete().eq('id',evidenceId).eq('asset_id',id);
    if (rowError) { alert(rowError.message); return; }
    await db.storage.from('quote-photos').remove([path]);
    location.reload();
  }));

  root.querySelector('#handoff-photo-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const files=[...(root.querySelector('#handoff-photos').files || [])];
    const message=root.querySelector('#handoff-photo-message');
    if (!files.length) { message.textContent='Choose at least one photograph.'; return; }
    message.textContent='Uploading photographs…';
    const rows=[];
    for (const file of files) {
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const path='inventory/'+id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'-'+safe;
      const {error:uploadError}=await db.storage.from('quote-photos').upload(path,file,{upsert:false});
      if (uploadError) { message.textContent=uploadError.message; message.className='form-message error'; return; }
      rows.push({asset_id:id,evidence_type:'Photographs',file_url:path,notes:'Sales presentation photograph',created_by:session.user.id});
    }
    const {error}=await db.from('inventory_evidence').insert(rows);
    message.textContent=error ? error.message : 'Photographs uploaded.';
    message.className='form-message'+(error?' error':'');
    if (!error) setTimeout(()=>location.reload(),400);
  });

  root.querySelector('#edit-inspection-report')?.addEventListener('click', () => {
    const note=root.querySelector('#inspection-edit-note');
    note.textContent='Inspection correction remains a controlled report edit. Open the asset through the Inventory workflow if a factual inspection correction is required; this Sales handoff view does not restart the inspection workflow.';
    note.className='form-message';
  });
});