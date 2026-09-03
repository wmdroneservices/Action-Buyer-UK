-- Persistent research source registry for GearCashOut AI evidence research.
-- Sources are classified so UK new, UK used, official and overseas evidence remain separate.

alter table public.quote_catalog_ai_sources
  add column if not exists homepage_url text,
  add column if not exists search_url_template text,
  add column if not exists research_scope text,
  add column if not exists last_verified_at timestamptz;

update public.quote_catalog_ai_sources
set homepage_url = coalesce(homepage_url,
  case domain
    when 'brighttangerine.com' then 'https://www.brighttangerine.com/'
    when 'dji.com' then 'https://www.dji.com/uk'
    when 'sony.co.uk' then 'https://www.sony.co.uk/'
    when 'amazon.co.uk' then 'https://www.amazon.co.uk/'
    when 'ebay.co.uk' then 'https://www.ebay.co.uk/'
    when 'mpb.com' then 'https://www.mpb.com/en-uk'
    when 'webuy.com' then 'https://uk.webuy.com/'
  end
);

insert into public.quote_catalog_ai_sources
(source_name,domain,country_code,source_kind,enabled,priority,notes,homepage_url,research_scope)
values
('Jessops','jessops.com','GB','retailer',true,20,'UK camera and electronics retailer; genuine UK new retail evidence.','https://www.jessops.com/','new_uk'),
('Wex Photo Video','wexphotovideo.com','GB','retailer',true,20,'UK specialist photo/video retailer; genuine UK new retail evidence.','https://www.wexphotovideo.com/','new_uk'),
('Park Cameras','parkcameras.com','GB','retailer',true,20,'UK specialist camera retailer; new UK evidence and clearly labelled used stock where relevant.','https://www.parkcameras.com/','new_uk'),
('London Camera Exchange','lcegroup.co.uk','GB','used_dealer',true,30,'UK specialist dealer with significant used equipment evidence.','https://www.lcegroup.co.uk/','used_uk'),
('CameraWorld','cameraworld.co.uk','GB','retailer',true,30,'UK specialist camera retailer; primarily new UK evidence.','https://www.cameraworld.co.uk/','new_uk'),
('Clifton Cameras','cliftoncameras.co.uk','GB','retailer',true,30,'UK specialist photo retailer; UK retail comparisons.','https://www.cliftoncameras.co.uk/','new_uk'),
('Harrison Cameras','harrisoncameras.co.uk','GB','retailer',true,30,'UK specialist camera retailer; UK retail comparisons.','https://www.harrisoncameras.co.uk/','new_uk'),
('Ffordes Photographic','ffordes.com','GB','used_dealer',true,35,'UK camera dealer with new and used stock; classify condition carefully.','https://www.ffordes.com/','used_uk'),
('Facebook Marketplace','facebook.com','GB','marketplace',true,60,'Marketplace evidence only; exact-match and availability checks required.','https://www.facebook.com/marketplace/','used_uk'),
('Vinted UK','vinted.co.uk','GB','marketplace',true,60,'UK marketplace evidence; used-market evidence only.','https://www.vinted.co.uk/','used_uk'),
('KEH Camera','keh.com','US','used_dealer',true,80,'US specialist used-camera dealer; overseas comparison only.','https://www.keh.com/','overseas'),
('B&H Photo Video','bhphotovideo.com','US','retailer',true,80,'US specialist retailer; overseas comparison only.','https://www.bhphotovideo.com/','overseas'),
('Adorama','adorama.com','US','retailer',true,80,'US specialist retailer; overseas comparison only.','https://www.adorama.com/','overseas');