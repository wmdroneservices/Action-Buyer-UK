/* GearCashOut catalogue evidence tools.
   Adds per-evidence age indicators and separate manual-entry blocks for:
   1) UK NEW pricing evidence (affects Online comparison)
   2) UK USED / OTHER evidence (reference only)
   3) Overseas comparison (reference only; original currency; no conversion)
*/
(function(){
'use strict';
const sb=()=>window.actionBuyerAuth?.supabase;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const sym={GBP:'£',USD:'$',EUR:'€',CAD:'C$',AUD:'A$',NZD:'NZ$',JPY:'¥',CNY:'¥',CHF:'CHF ',SEK:'kr ',NOK:'kr ',DKK:'kr ',PLN:'zł ',CZK:'Kč ',INR:'₹'};
function ageInfo(ts){
  if(!ts)return {label:'Evidence date: not recorded',cls:'evidence-age-stale'};
  const d=new Date(ts); if(Number.isNaN(d.getTime()))return {label:'Evidence date: invalid',cls:'evidence-age-stale'};
  const days=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));
  const label=days===0?'checked today':days===1?'1 day old':`${days} days old`;
  return {label:`Checked ${d.toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'})} — ${label}`,cls:days>=42?'evidence-age-stale':'evidence-age-fresh'};
}
function css(){if(document.getElementById('gco-evidence-tools-css'))return;const s=document.createElement('style');s.id='gco-evidence-tools-css';s.textContent=`
.gco-evidence-age{display:block;margin-top:.25rem;font-size:.68rem;font-weight:700}.evidence-age-fresh{color:#18733b}.evidence-age-stale{color:#c62828}
.gco-manual-evidence{margin-top:1rem;padding:1rem;border:1px solid #d8d4ca;border-radius:8px;background:#fff}.gco-manual-evidence h5{margin:.05rem 0 .35rem;color:#102f4f;font-size:.9rem}.gco-manual-evidence p{margin:.2rem 0 .75rem;color:#666;font-size:.78rem}.gco-manual-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}.gco-manual-grid label{font-size:.72rem;font-weight:700;color:#102f4f}.gco-manual-grid input,.gco-manual-grid select{width:100%;box-sizing:border-box;margin-top:.2rem;padding:.45rem}.gco-manual-grid .wide{grid-column:span 2}.gco-manual-actions{display:flex;align-items:center;gap:.6rem;margin-top:.65rem}.gco-manual-status{font-size:.75rem}.gco-manual-status.ok{color:#18733b}.gco-manual-status.err{color:#c62828}@media(max-width:900px){.gco-manual-grid{grid-template-columns:1fr 1fr}.gco-manual-grid .wide{grid-column:auto}}@media(max-width:520px){.gco-manual-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function form(section,kind){
  const overseas=kind==='overseas';
  const newEvidence=kind==='new';
  const title=newEvidence?'MANUALLY ADD UK NEW PRICING EVIDENCE':kind==='used'?'MANUALLY ADD UK USED / OTHER EVIDENCE':'MANUALLY ADD OVERSEAS EVIDENCE';
  const desc=newEvidence?'UK + GBP + normal online retailer/manufacturer + New/New Sale only. This evidence affects Online comparison.':kind==='used'?'UK marketplace NEW/USED, used/refurbished/other UK reference evidence. This never affects Online comparison.':'Non-GBP / overseas evidence. Keep the original currency. This never affects UK Online comparison.';
  const typeOptions=newEvidence?'<option value="new">New</option><option value="new_sale">New — Sale / Offer</option>':'<option value="market">Market Reference</option><option value="used">Used</option><option value="refurbished">Refurbished</option><option value="completed_sale">Completed Sale</option><option value="competitor_buying">Competitor Buying</option><option value="new">New (reference)</option>';
  return `<div class="gco-manual-evidence" data-manual-kind="${kind}"><h5>${title}</h5><p>${desc}</p><form class="gco-manual-form"><div class="gco-manual-grid"><label>Website / Competitor<input name="retailer" required placeholder="Website / seller"></label><label>Price type<select name="price_type">${typeOptions}</select></label><label>Condition<input name="condition" placeholder="New / Used / Excellent"></label><label>${overseas?'Currency':'Selling price (£)'}${overseas?'<input name="price_currency" required value="USD" maxlength="3" placeholder="USD">':'<input name="sell_price" type="number" min="0" step="0.01" required placeholder="0.00">'}</label>${overseas?'<label>Price<input name="sell_price" type="number" min="0" step="0.01" required placeholder="0.00"></label><label>Country / Region<input name="evidence_region" required placeholder="USA / Germany"></label>':'<label>Buying price (£)<input name="buy_price" type="number" min="0" step="0.01" placeholder="Optional"></label><label>Availability<select name="availability_status"><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="unknown">Unknown</option></select></label>'}<label class="wide">Direct source URL<input name="source_url" type="url" required placeholder="https://..."></label><label class="wide">Notes<input name="notes" placeholder="Package, sale details, condition, evidence context"></label></div><div class="gco-manual-actions"><button class="btn btn-secondary" type="submit">ADD EVIDENCE</button><span class="gco-manual-status" aria-live="polite"></span></div></form></div>`;
}
async function evidenceRows(id){const a=sb();if(!a)return[];const q=await a.from('quote_catalog_retailer_prices').select('id,retailer,price_type,condition,sell_price,checked_at').eq('catalog_product_id',id);return q.error?[]:(q.data||[])}
function key(r){return [String(r.retailer||'').trim(),String(r.price_type||'').trim(),String(r.condition||'').trim(),r.sell_price==null?'':Number(r.sell_price).toFixed(2)].join('|')}
function annotate(card,rows){
  const all=[...rows];card.querySelectorAll('.gco-table tbody tr').forEach(tr=>{
    if(tr.querySelector('.gco-evidence-age'))return;
    const cells=tr.querySelectorAll('td');if(!cells.length)return;
    const k=[cells[0]?.textContent.trim()||'',cells[1]?.textContent.trim().toLowerCase().replaceAll(' ','_')||'',cells[2]?.textContent.trim()||'',(cells[5]?.textContent||cells[3]?.textContent||'').replace(/[^0-9.]/g,'')].join('|');
    let r=all.find(x=>key(x)===k)||all.find(x=>String(x.retailer||'').trim()===cells[0]?.textContent.trim()&&String(x.price_type||'').trim().replaceAll('_',' ')===cells[1]?.textContent.trim());
    if(!r)return;const info=ageInfo(r.checked_at);const note=cells[cells.length-1];const el=document.createElement('span');el.className=`gco-evidence-age ${info.cls}`;el.textContent=info.label;note.appendChild(el);
  });
}
async function add(e){e.preventDefault();const f=e.currentTarget,a=sb(),card=f.closest('.gco-card'),id=card?.dataset.productId,kind=f.closest('.gco-manual-evidence')?.dataset.manualKind,status=f.querySelector('.gco-manual-status');if(!a||!id)return;status.textContent='Saving…';status.className='gco-manual-status';const fd=new FormData(f);const overseas=kind==='overseas',payload={catalog_product_id:id,retailer:String(fd.get('retailer')||'').trim(),price_type:String(fd.get('price_type')||'market'),condition:String(fd.get('condition')||'').trim(),buy_price:fd.get('buy_price')?Number(fd.get('buy_price')):null,sell_price:fd.get('sell_price')?Number(fd.get('sell_price')):null,buy_method:'',source_url:String(fd.get('source_url')||'').trim(),notes:String(fd.get('notes')||'').trim(),checked_at:new Date().toISOString(),price_currency:overseas?String(fd.get('price_currency')||'').trim().toUpperCase():'GBP',evidence_region:overseas?String(fd.get('evidence_region')||'').trim().toUpperCase():'UK',price_region:overseas?String(fd.get('evidence_region')||'').trim().toUpperCase():'UK',availability_status:overseas?'unknown':String(fd.get('availability_status')||'unknown')};
  if(!payload.retailer||!payload.source_url||payload.sell_price==null){status.textContent='Website, source URL and selling price are required.';status.className='gco-manual-status err';return}
  if(!overseas&&(!payload.price_currency||payload.price_currency!=='GBP')){status.textContent='UK evidence must use GBP.';status.className='gco-manual-status err';return}
  if(overseas&&payload.price_currency==='GBP'){status.textContent='Overseas evidence must remain non-GBP and unconverted.';status.className='gco-manual-status err';return}
  const q=await a.from('quote_catalog_retailer_prices').insert(payload);if(q.error){status.textContent=q.error.message;status.className='gco-manual-status err';return}status.textContent='Evidence added with fresh timestamp.';status.className='gco-manual-status ok';f.reset();if(overseas)f.querySelector('[name="price_currency"]').value='USD';setTimeout(()=>location.reload(),350);
}
async function enhance(card){if(card.dataset.gcoEvidenceTools==='1')return;const id=card.dataset.productId;if(!id)return;card.dataset.gcoEvidenceTools='1';const rows=await evidenceRows(id);annotate(card,rows);const sections=[...card.querySelectorAll('.gco-section')];const newSec=sections.find(s=>s.classList.contains('gco-new')),usedSec=sections.find(s=>s.classList.contains('gco-used')),overSec=sections.find(s=>s.classList.contains('gco-overseas'));if(newSec&&!newSec.querySelector('[data-manual-kind]'))newSec.insertAdjacentHTML('beforeend',form(newSec,'new'));if(usedSec&&!usedSec.querySelector('[data-manual-kind]'))usedSec.insertAdjacentHTML('beforeend',form(usedSec,'used'));if(overSec&&!overSec.querySelector('[data-manual-kind]'))overSec.insertAdjacentHTML('beforeend',form(overSec,'overseas'));card.querySelectorAll('.gco-manual-form').forEach(f=>{if(f.dataset.bound==='1')return;f.dataset.bound='1';f.addEventListener('submit',add)});
}
function wire(){css();const list=document.getElementById('catalog-list');if(!list)return;const run=()=>list.querySelectorAll('.gco-card').forEach(enhance);new MutationObserver(run).observe(list,{childList:true,subtree:true});run();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
