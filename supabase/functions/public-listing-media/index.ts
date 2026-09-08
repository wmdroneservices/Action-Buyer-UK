import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins=new Set(["https://wmdroneservices.github.io"]);

function cors(origin:string|null){
  const allow=origin&&allowedOrigins.has(origin)?origin:"https://wmdroneservices.github.io";
  return {
    "Access-Control-Allow-Origin":allow,
    "Access-Control-Allow-Headers":"apikey, authorization, content-type",
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
    "Vary":"Origin"
  };
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  const headers={...cors(origin),"Content-Type":"application/json"};
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
  if(!["GET","POST"].includes(req.method)) return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});

  let listingId:string|null=null;
  try{
    listingId=req.method==="GET"
      ?new URL(req.url).searchParams.get("listing_id")
      :(await req.json())?.listing_id??null;
  }catch{
    return new Response(JSON.stringify({error:"Invalid request"}),{status:400,headers});
  }

  if(!listingId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId)){
    return new Response(JSON.stringify({error:"Invalid listing"}),{status:400,headers});
  }

  const url=Deno.env.get("SUPABASE_URL");
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key) return new Response(JSON.stringify({error:"Server configuration unavailable"}),{status:500,headers});

  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:paths,error}=await admin.rpc("public_storefront_listing_media_paths_internal",{
    p_store_key:"retail",p_listing_id:listingId
  });
  if(error) return new Response(JSON.stringify({error:"Listing media unavailable"}),{status:500,headers});

  const unique=[...new Set((paths??[]).filter((p:unknown)=>typeof p==="string"&&p.trim()))] as string[];
  if(!unique.length) return new Response(JSON.stringify({images:[]}),{status:200,headers});

  const {data:signed,error:signedError}=await admin.storage.from("quote-photos").createSignedUrls(unique,3600);
  if(signedError) return new Response(JSON.stringify({error:"Listing media unavailable"}),{status:500,headers});

  const images=(signed??[]).filter((row:any)=>row?.signedUrl).map((row:any)=>({url:row.signedUrl,path:row.path}));
  return new Response(JSON.stringify({images}),{status:200,headers});
});
