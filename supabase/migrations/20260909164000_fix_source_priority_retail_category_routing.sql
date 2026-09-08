create or replace function public.canonical_storefront_category(p_main_category text,p_category text,p_product_type text default null)
returns text language plpgsql immutable set search_path to 'public' as $$
declare
  v_source text := lower(concat_ws(' ', nullif(btrim(coalesce(p_main_category,'')),''), nullif(btrim(coalesce(p_category,'')),'')));
  v_type text := lower(btrim(coalesce(p_product_type,'')));
  v text;
begin
  v := v_source;
  if v like '%action camera access%' then return 'Camera Accessories'; end if;
  if v like '%drone accessory%' or v like '%fpv equipment%' or v like '%payload%' or v like '%goggles%' or v like '%remote controller%' then return 'Drone Accessories'; end if;
  if v like '%action camera%' then return 'Action Cameras'; end if;
  if v like '%drone%' then return 'Drones'; end if;
  if v like '%power%' or v like '%batter%' then return 'Power & Batteries'; end if;
  if v like '%lens%' or v like '%optics%' then return 'Lenses'; end if;
  if v like '%lighting%' or v like '%light%' or v like '%camera flash%' then return 'Lighting'; end if;
  if v like '%tripod%' or v like '%support%' or v like '%gimbal%' or v like '%stabilis%' or v like '%stabiliz%' or v like '%monopod%' then return 'Supports & Stabilisation'; end if;
  if v like '%studio equipment%' then return 'Studio Equipment'; end if;
  if v like '%video camera%' or v like '%cinema camera%' or v like '%camcorder%' or v like '%body camera%' or v like '%broadcast camera%' or v like '%ptz camera%' or v like '%remote camera%' then return 'Video Cameras'; end if;
  if v like '%video production%' or v like '%video equipment%' or v like '%camera rig%' or v like '%camera control%' or v like '%camera monitor%' or v like '%camera slider%' or v like '%switcher%' or v like '%recorder%' or v like '%deck/%' or v like '%streaming%' or v like '%transmission%' or v like '%audio & video%' or v like '%camera & video%' then return 'Video Production Equipment'; end if;
  if v like '%professional audio%' or v like '%audio%' or v like '%microphone%' or v like '%wireless sync%' then return 'Audio'; end if;
  if v like '%accessor%' or v like '%camera bag%' or v like '%bag%' or v like '%case%' then return 'Camera Accessories'; end if;
  if v like '%camera equipment%' or v like '%camera%' or v like '%phone photography%' then return 'Cameras'; end if;
  v := v_type;
  if v like '%action camera access%' then return 'Camera Accessories'; end if;
  if v like '%drone accessory%' or v like '%fpv%' or v like '%payload%' then return 'Drone Accessories'; end if;
  if v like '%action camera%' then return 'Action Cameras'; end if;
  if v like '%drone%' then return 'Drones'; end if;
  if v like '%power%' or v like '%batter%' then return 'Power & Batteries'; end if;
  if v like '%lens%' or v like '%optics%' then return 'Lenses'; end if;
  if v like '%lighting%' or v like '%light%' or v like '%flash%' then return 'Lighting'; end if;
  if v like '%tripod%' or v like '%support%' or v like '%gimbal%' or v like '%stabilis%' or v like '%stabiliz%' or v like '%monopod%' then return 'Supports & Stabilisation'; end if;
  if v like '%video camera%' or v like '%cinema camera%' or v like '%camcorder%' then return 'Video Cameras'; end if;
  if v like '%video%' or v like '%camera rig%' or v like '%monitor%' or v like '%switcher%' or v like '%recorder%' or v like '%streaming%' or v like '%transmission%' then return 'Video Production Equipment'; end if;
  if v like '%audio%' or v like '%microphone%' then return 'Audio'; end if;
  if v like '%accessor%' or v like '%bag%' or v like '%case%' then return 'Camera Accessories'; end if;
  if v like '%camera%' then return 'Cameras'; end if;
  return 'Other Equipment';
end;
$$;