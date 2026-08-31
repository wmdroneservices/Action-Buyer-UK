/* GearCashOut: Website / Competitor selector with direct website links. */
(function(){
  'use strict';

  const competitors=[
    {name:'BetaFPV',url:'https://betafpv.com/'},
    {name:'DJI',url:'https://www.dji.com/'},
    {name:'Autel Robotics',url:'https://www.autelrobotics.com/'},
    {name:'HobbyKing',url:'https://hobbyking.com/'},
    {name:'GetFPV',url:'https://www.getfpv.com/'},
    {name:'iFlight',url:'https://www.iflight.com/'},
    {name:'GEPRC',url:'https://geprc.com/'},
    {name:'Rotor Riot',url:'https://rotorriot.com/'},
    {name:'Amazon UK',url:'https://www.amazon.co.uk/'},
    {name:'eBay UK',url:'https://www.ebay.co.uk/'},
    {name:'MPB',url:'https://www.mpb.com/en-uk/'},
    {name:'CeX',url:'https://uk.webuy.com/'},
    {name:'Gumtree',url:'https://www.gumtree.com/'},
    {name:'Vinted',url:'https://www.vinted.co.uk/'},
    {name:'Facebook Marketplace',url:'https://www.facebook.com/marketplace/'},
    {name:'Custom / Other',url:''}
  ];

  const canonical=new Map(competitors.map(x=>[x.name.toLowerCase(),x.url]));
  let observer;
  let busy=false;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function safeUrl(v){try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}

  function enhanceRow(tr){
    if(!tr||tr.dataset.competitorEnhanced==='1')return;
    const input=tr.querySelector('.retailer');
    if(!input)return;

    const current=(input.value||'').trim();
    const select=document.createElement('select');
    select.className='retailer competitor-select';
    select.setAttribute('aria-label','Website / Competitor');

    const names=competitors.map(x=>x.name);
    if(current && !names.some(n=>n.toLowerCase()===current.toLowerCase())){
      const customCurrent=document.createElement('option');
      customCurrent.value=current;
      customCurrent.textContent=current;
      select.appendChild(customCurrent);
    }
    competitors.forEach(c=>{
      const option=document.createElement('option');
      option.value=c.name;
      option.textContent=c.name;
      select.appendChild(option);
    });

    const matched=competitors.find(c=>c.name.toLowerCase()===current.toLowerCase());
    select.value=matched?matched.name:(current||'Custom / Other');
    input.replaceWith(select);

    const link=document.createElement('a');
    link.className='retailer-link competitor-website-link';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.textContent='OPEN WEBSITE ↗';

    const sourceInput=tr.querySelector('.retailer-source');
    const linkHost=tr.querySelector('.competitor-website-link');
    if(!linkHost){
      const cell=select.closest('td');
      cell.appendChild(link);
    }

    function updateLink(){
      const chosen=select.value;
      const canonicalUrl=canonical.get(chosen.toLowerCase())||'';
      const source=safeUrl(sourceInput?.value?.trim());
      const url=source||canonicalUrl;
      if(url){
        link.href=url;
        link.classList.remove('disabled');
        link.title=source?'Open the recorded source page':'Open the competitor website';
      }else{
        link.removeAttribute('href');
        link.classList.add('disabled');
        link.title='Enter a source URL for this competitor';
      }
    }

    select.addEventListener('change',function(){
      const chosen=select.value;
      const canonicalUrl=canonical.get(chosen.toLowerCase())||'';
      if(sourceInput && !sourceInput.value.trim() && canonicalUrl){
        sourceInput.value=canonicalUrl;
        sourceInput.dispatchEvent(new Event('input',{bubbles:true}));
      }
      updateLink();
    });
    sourceInput?.addEventListener('input',updateLink);
    updateLink();
    tr.dataset.competitorEnhanced='1';
  }

  function enhance(){
    document.querySelectorAll('#retailer-prices-body tr[data-index]').forEach(enhanceRow);
  }

  function wire(){
    const body=document.getElementById('retailer-prices-body');
    if(!body||observer)return;
    observer=new MutationObserver(()=>{if(busy)return;busy=true;enhance();busy=false;});
    observer.observe(body,{childList:true,subtree:true});
    enhance();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
