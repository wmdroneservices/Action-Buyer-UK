-- A customer submission is one valuation, even when it contains multiple items.
-- quote_items remain separate so each item can have its own automatic/manual/final offer.

CREATE OR REPLACE FUNCTION public.create_customer_quotes(p_record jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_valuation_id uuid;
  v_quote_reference text;
  v_submission_key text;
  v_existing_id uuid;
  v_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN RAISE EXCEPTION 'At least one quote item is required'; END IF;
  v_submission_key := NULLIF(TRIM(p_record->>'submissionKey'), '');

  IF v_submission_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.valuations
    WHERE user_id = v_user AND archived_at IS NULL AND quote_data->>'submissionKey' = v_submission_key
    ORDER BY submitted_at DESC LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count FROM public.quote_items WHERE valuation_id = v_existing_id;
      SELECT quote_reference INTO v_quote_reference FROM public.valuations WHERE id = v_existing_id;
      RETURN jsonb_build_object('valuation_id',v_existing_id,'quote_reference',v_quote_reference,'created_count',0,'duplicate_request',true,'item_count',v_count);
    END IF;
  END IF;

  v_quote_reference := 'WBA-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*900000)+100000)::text,6,'0');

  INSERT INTO public.valuations(user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,quote_data)
  VALUES(v_user,v_quote_reference,'submitted',NULL,NULL,NULL,NULL,NULL,
    jsonb_set(jsonb_set(COALESCE(p_record,'{}'::jsonb),'{multiItemQuote}',to_jsonb(jsonb_array_length(p_items) > 1),true),'{quoteItemCount}',to_jsonb(jsonb_array_length(p_items)),true))
  RETURNING id INTO v_valuation_id;

  INSERT INTO public.quote_items(valuation_id,item_name,manufacturer,model,package,item_status,item_position,item_data)
  SELECT v_valuation_id,
         COALESCE(NULLIF(TRIM(x.item->>'itemName'),''),NULLIF(TRIM(x.item->>'model'),''),'Equipment item'),
         NULLIF(TRIM(x.item->>'manufacturer'),''),
         NULLIF(TRIM(x.item->>'model'),''),
         NULLIF(TRIM(COALESCE(x.item->>'packageName',x.item->>'package','')),''),
         'under_assessment',x.ord::integer,x.item
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(item,ord);

  SELECT COUNT(*) INTO v_count FROM public.quote_items WHERE valuation_id = v_valuation_id;
  RETURN jsonb_build_object('valuation_id',v_valuation_id,'quote_reference',v_quote_reference,'created_count',1,'item_count',v_count,'duplicate_request',false);
END;
$$;
