/* Shows each multi-item submission's photographs beneath the matching staff item. */
(function(){
  "use strict";
  async function load(){
    const auth=window.actionBuyerAuth;if(!auth)return;
    const id=new URLSearchParams(location.search).get("id");if(!id)return;
    const {data:valuation}=await auth.supabase.from("valuations").select("quote_data").eq("id",id).maybeSingle();
    const groups=Array.isArray(valuation?.quote_data?.itemPhotos)?valuation.quote_data.itemPhotos:[];
    if(!groups.length)return;
    const box=document.getElementById("offer-controls");if(!box)return;
    const cards=Array.from(box.querySelectorAll("article.valuation-card"));
    groups.forEach((photos,index)=>{
      if(!Array.isArray(photos)||!photos.length||!cards[index])return;
      if(cards[index].querySelector(".item-photo-grid"))return;
      const section=document.createElement("div");section.style.marginTop="1rem";
      section.innerHTML='<h4>Photographs for this item</h4><div class="admin-photo-grid item-photo-grid"></div>';
      const grid=section.querySelector(".item-photo-grid");
      photos.forEach((photo,i)=>{const path=typeof photo==="string"?photo:photo?.path;if(!path)return;const a=document.createElement("a");a.href=path;a.target="_blank";a.rel="noopener";const img=document.createElement("img");img.src=path;img.alt=`Item ${index+1} photograph ${i+1}`;img.loading="lazy";a.appendChild(img);grid.appendChild(a);});
      cards[index].querySelector("div[style*=\"width:100%\"]")?.appendChild(section);
    });
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(load,500));
})();
