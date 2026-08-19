function initGearCashOutResultFix() {
  const form = document.getElementById("quote-form");
  if (!form) return;
  window.__gearCashOutItems = window.__gearCashOutItems || [];
  function currentStep(){return Array.from(form.querySelectorAll('.wizard-step')).find(s=>!s.hidden);}
  function nonDJI(){const c=document.getElementById('gear-category'),m=document.getElementById('gear-manufacturer');return c&&m&&!(c.value==='drone'&&m.value==='DJI');}
  function text(id){const e=document.getElementById(id);return e&&e.options&&e.selectedIndex>=0?e.options[e.selectedIndex].textContent.trim():'';}
  function show(n){form.querySelectorAll('.wizard-step').forEach(s=>s.hidden=Number(s.dataset.step)!==n);window.scrollTo({top:0,behavior:'smooth'});}
  function render(){
    if(!nonDJI())return;
    const step=form.querySelector('[data-step="12"]'),summary=document.getElementById('quote-summary');if(!step||!summary)return;
    step.querySelectorAll('#quote-important,.quote-important,#quote-result-action,.btn-accept').forEach(e=>e.remove());
    const title=document.getElementById('quote-result-title');if(title)title.textContent='Manual Valuation Required';
    const category=text('gear-category'),manufacturer=text('gear-manufacturer'),model=text('dji-model');
    if(!window.__gearCashOutItems.some(i=>i.model===model&&i.manufacturer===manufacturer))window.__gearCashOutItems.push({category,manufacturer,model});
    summary.innerHTML='<div class="manual-valuation-box"><h3>Manual Valuation Required</h3><p><strong>Equipment:</strong> '+category+'</p><p><strong>Manufacturer:</strong> '+manufacturer+'</p><p><strong>Model:</strong> '+model+'</p><p>We do not currently have a verified automatic purchase price for this equipment. Your information and photographs will be reviewed manually.</p><p><strong>No £0 offer has been made.</strong></p></div><div class="quote-basket-preview"><h3>Your Quote</h3><p>You can add more equipment before submitting your quote.</p><ol>'+window.__gearCashOutItems.map(i=>'<li><strong>'+i.model+'</strong> — Manual valuation</li>').join('')+'</ol><p><strong>Total:</strong> Manual valuation after review</p></div><div class="manual-quote-actions"><button type="button" class="btn" id="add-another-item">Add Another Item</button> <button type="button" class="btn btn-continue-manual" id="continue-with-quote">Continue with This Quote</button></div>';
  }
  form.addEventListener('click',function(event){
    const button=event.target.closest('button');if(!button||!nonDJI())return;const step=currentStep();if(!step)return;const n=Number(step.dataset.step);
    if(n===12&&button.id==='add-another-item'){event.preventDefault();event.stopImmediatePropagation();form.querySelectorAll('.wizard-step').forEach(s=>s.hidden=true);form.querySelector('[data-step="1"]').hidden=false;document.getElementById('gear-category').value='';document.getElementById('gear-manufacturer').innerHTML='<option value="">-- Select manufacturer --</option>';document.getElementById('gear-manufacturer').disabled=true;document.getElementById('dji-model').innerHTML='<option value="">-- Select a model --</option>';return;}
    if(n===12&&button.id==='continue-with-quote'){event.preventDefault();event.stopImmediatePropagation();show(13);return;}
    if(n===13&&button.classList.contains('btn-next')){event.preventDefault();event.stopImmediatePropagation();const name=document.getElementById('full-name'),email=document.getElementById('email-address'),phone=document.getElementById('phone-number');if(!name.value.trim())return alert('Please enter your full name.');if(!email.value.trim())return alert('Please enter your email address.');if(!phone.value.trim())return alert('Please enter your telephone number.');show(14);return;}
  },true);
  const result=form.querySelector('[data-step="12"]');if(result)new MutationObserver(function(){if(!result.hidden&&nonDJI())render();}).observe(result,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initGearCashOutResultFix);else initGearCashOutResultFix();
