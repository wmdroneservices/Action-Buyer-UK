document.addEventListener('DOMContentLoaded', function(){
  const form=document.getElementById('quote-form');
  const category=document.getElementById('gear-category');
  const box=document.getElementById('additional-items-container');
  if(!form||!category||!box)return;
  const sets={
    drone:['Additional battery','Additional controller','Additional charger','Additional charging hub','Hard case','Carry case / bag','Additional propeller set','Additional cable'],
    'action-camera':['Additional battery','Additional charger','Hard case','Carry case','Additional mounting kit','Media / accessory mod','Additional cable','Memory card'],
    camera:['Additional battery','Battery grip','Additional charger','Hard case','Camera bag','Memory card','Additional cable','Strap'],
    lens:['Lens hood','Front/rear caps','Lens case / pouch','Protective filter','Hard case','Cleaning kit'],
    accessory:['Additional battery','Additional charger','Hard case','Carry case','Additional cable','Mount / bracket','Adapter','Other accessory']
  };
  function render(){
    const items=sets[category.value]||[];
    box.innerHTML='';
    if(!items.length)return;
    const heading=document.createElement('h4');heading.textContent='Additional Items';box.appendChild(heading);
    const note=document.createElement('p');note.textContent='List any extra accessories you are including. Small additions may increase the valuation slightly.';box.appendChild(note);
    items.forEach(function(name,index){
      const row=document.createElement('div');row.className='additional-item-row';
      row.innerHTML='<label for="additional-item-'+index+'">'+name+'</label><select id="additional-item-'+index+'" name="additionalItems"><option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>';
      box.appendChild(row);
    });
  }
  category.addEventListener('change',render);
  render();
});
