CREATE OR REPLACE FUNCTION public.accept_quote_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
 v_item public.quote_items%rowtype;
 v_offer public.quote_offers%rowtype;
 v_user uuid:=auth.uid();
 v_submission_key text;
 v_sale public.sales%rowtype;
 v_sale_item public.sale_items%rowtype;
 v_total numeric(12,2);
 v_inbound_status text;
BEGIN
 SELECT qi.* INTO v_item FROM public.quote_items qi JOIN public.valuations v ON v.id=qi.valuation_id JOIN public.quote_offers qo ON qo.item_id=qi.id WHERE qo.id=p_offer_id AND v.user_id=v_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Offer is not available for acceptance'; END IF;
 SELECT qo.* INTO v_offer FROM public.quote_offers qo JOIN public.quote_items qi ON qi.id=qo.item_id JOIN public.valuations v ON v.id=qi.valuation_id WHERE qo.id=p_offer_id AND v.user_id=v_user FOR UPDATE;
 IF NOT FOUND OR v_offer.status<>'published' THEN RAISE EXCEPTION 'Offer is not available for acceptance'; END IF;
 SELECT quote_data->>'submissionKey' INTO v_submission_key FROM public.valuations WHERE id=v_item.valuation_id;
 IF NULLIF(TRIM(v_submission_key),'') IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.quote_items qi2
   WHERE qi2.valuation_id=v_item.valuation_id
     AND qi2.item_status NOT IN ('refused','closed','accepted')
     AND NOT EXISTS (SELECT 1 FROM public.quote_offers qo2 WHERE qo2.item_id=qi2.id AND qo2.status='published' AND qo2.offer_type IN ('manual','final'))
     AND NOT EXISTS (SELECT 1 FROM public.quote_offers qo3 WHERE qo3.item_id=qi2.id AND qo3.status='published' AND qo3.offer_type='automatic'
       AND NOT EXISTS (SELECT 1 FROM public.quote_offers qo4 WHERE qo4.item_id=qi2.id AND qo4.status='published' AND qo4.offer_type IN ('manual','final')))
 ) THEN RAISE EXCEPTION 'This is a combined valuation. Please wait until all item prices have been reviewed and published before accepting or refusing the quote.'; END IF;
 IF v_offer.offer_type='automatic' AND EXISTS(SELECT 1 FROM public.quote_offers WHERE item_id=v_offer.item_id AND status='published' AND offer_type IN ('manual','final')) THEN RAISE EXCEPTION 'This automatic valuation has been replaced by a staff valuation.'; END IF;
 UPDATE public.quote_offers SET status='accepted',responded_at=now(),updated_at=now() WHERE id=p_offer_id;
 UPDATE public.quote_items SET item_status='accepted',updated_at=now() WHERE id=v_offer.item_id;
 UPDATE public.quote_offers SET status='superseded',updated_at=now() WHERE item_id=v_offer.item_id AND id<>p_offer_id AND status='published';
 INSERT INTO public.offer_events(offer_id,event_type,actor_user_id) VALUES(p_offer_id,'accepted',v_user);
 SELECT * INTO v_sale FROM public.sales WHERE user_id=v_user AND status NOT IN ('paid','completed','cancelled') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN
   INSERT INTO public.sales(user_id,sale_reference,status,total_amount,accepted_at,payment_status)
   VALUES(v_user,'GCO-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(gen_random_uuid()::text,1,6),CASE WHEN v_offer.offer_type='final' THEN 'payment_due' ELSE 'collecting_items' END,0,now(),CASE WHEN v_offer.offer_type='final' THEN 'awaiting_bank_details' ELSE 'awaiting_final_quote' END)
   RETURNING * INTO v_sale;
 END IF;
 INSERT INTO public.sale_items(sale_id,quote_item_id,accepted_offer_id,amount) VALUES(v_sale.id,v_offer.item_id,v_offer.id,v_offer.amount)
 ON CONFLICT(sale_id,quote_item_id) DO UPDATE SET accepted_offer_id=excluded.accepted_offer_id,amount=excluded.amount
 RETURNING * INTO v_sale_item;
 SELECT status INTO v_inbound_status FROM public.shipments WHERE sale_id=v_sale.id AND shipment_type='inbound' ORDER BY created_at DESC LIMIT 1;
 IF v_inbound_status IS NULL OR v_inbound_status NOT IN ('awaiting_label','label_required','label_created') THEN
   INSERT INTO public.shipments(sale_id,user_id,shipment_type,status) VALUES(v_sale.id,v_user,'inbound','awaiting_label');
 END IF;
 SELECT COALESCE(SUM(amount),0) INTO v_total FROM public.sale_items WHERE sale_id=v_sale.id;
 UPDATE public.sales SET total_amount=v_total,updated_at=now() WHERE id=v_sale.id;
 RETURN jsonb_build_object('sale_id',v_sale.id,'sale_reference',v_sale.sale_reference,'total_amount',v_total,'sale_item_id',v_sale_item.id);
END;
$$;
