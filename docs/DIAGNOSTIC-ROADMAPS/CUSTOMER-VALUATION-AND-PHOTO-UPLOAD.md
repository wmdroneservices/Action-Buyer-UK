# Developer Diagnostic Roadmap — Customer Valuation and Photo Upload

**Status:** Audited against current GitHub and live Supabase on 8 September 2026.

## User action

Customer opens **Start Your Valuation**, adds one or more items, uploads required photographs, signs in, and submits the valuation.

## Front-end entry point

`valuation.html`

Relevant active scripts:

- `auth.js` — creates/maintains the authenticated Supabase browser session.
- `quote-reverse-basket-v5.js` — holds the multi-item valuation basket and selected photo File objects.
- `quote-submit-v4.js` — uploads photographs and creates the combined customer valuation.
- `quote-account-gate.js` — controls the authenticated account step.

Current cache-busting references:

- `auth.js?v=20260908-1`
- `quote-submit-v4.js?v=20260908-1`

## Expected data flow

`valuation.html`
→ authenticated Supabase session from `auth.js`
→ selected files retained with basket items
→ `quote-submit-v4.js`
→ Storage bucket `quote-photos`
→ object path `{auth.uid()}/{quote-reference}/{safe-filename}`
→ public RPC `create_customer_quotes(...)`
→ `valuations`
→ `quote_items`
→ `quote_items.item_data.photos`.

## Relevant Supabase state

### Storage

Bucket:

`quote-photos`

Customer upload policy:

- authenticated users only;
- `bucket_id = 'quote-photos'`;
- first object folder must equal `auth.uid()`.

Customer SELECT policy uses the same ownership rule.

Staff SELECT policy allows authenticated staff listed in `staff_users` to view quote photos.

### Database

Primary submission path:

`create_customer_quotes(...)`

Relevant tables:

- `valuations`
- `quote_items`
- `staff_users` for staff Storage access.

## First failure points to check

1. **Wrong/stale browser JavaScript**
   - Check `valuation.html` script cache versions.
   - Check the browser actually fetched current `auth.js` and `quote-submit-v4.js`.

2. **Wrong Supabase project/client**
   - Check the current `auth.js` Supabase URL/project configuration.

3. **Authentication missing**
   - Upload policy requires `authenticated`.
   - Check `auth.getSession()` before upload.

4. **Storage bucket or RLS**
   - Verify `quote-photos` exists.
   - Verify object path begins with the current user's UUID.

5. **Upload succeeds but quote creation fails**
   - Inspect `create_customer_quotes(...)` and the `item_data.photos` payload.

## Known fault history

### 24 August 2026

The photo upload/storage path was repaired and the current `quote-photos` architecture was introduced.

### 26 August 2026

A follow-up repair advanced the quote-submit cache version, confirming stale browser JavaScript had already affected this workflow.

### 8 September 2026

A reported **Bucket not found** error was investigated against:

- current GitHub code;
- live Supabase bucket;
- live Storage RLS policies;
- recent successful quote/photo data;
- previous repair history.

The backend was confirmed operational and a recent quote already contained stored photo metadata. The minimal repair was therefore limited to advancing the active `auth.js` and `quote-submit-v4.js` cache identifiers in `valuation.html`.

No Storage bucket, RLS, database schema or upload logic was changed.

## External services

- Supabase Auth
- Supabase Storage
- Supabase PostgreSQL/RPC

The Research PC/Ollama system is not part of this customer photo-upload path.

## Verification procedure

After deployment:

1. hard-refresh or open a private/incognito browser window;
2. sign in with a customer account;
3. create a small test valuation;
4. attach at least one valid image;
5. submit the valuation;
6. confirm no **Bucket not found** error;
7. confirm the object exists in `quote-photos`;
8. confirm the created quote item contains photo metadata;
9. confirm existing customer/admin valuation behaviour still works.

If the error persists after current scripts are confirmed loaded, stop changing cache versions and inspect the first failing network request/error instead.
