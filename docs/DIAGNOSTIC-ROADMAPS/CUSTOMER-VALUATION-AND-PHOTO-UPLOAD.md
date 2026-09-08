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
- `quote-reverse-basket-v5.js?v=20260908-photo-persist-1`
- `quote-submit-v4.js?v=20260908-2`

## Expected data flow

`valuation.html`
→ authenticated Supabase session from `auth.js`
→ selected files persisted with basket items in same-origin IndexedDB
→ files restored after login/navigation and again immediately before submit
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

0. **Photo continuity after navigation/login**
   - The basket may survive in localStorage while File objects do not survive ordinary JavaScript memory.
   - Check whether the customer logged in, registered, refreshed, or otherwise reloaded after adding photographs.
   - Check IndexedDB persistence before changing Supabase.

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

### Later on 8 September 2026 — photograph loss after navigation

A real browser submission then reached the final account step but failed locally with **“Please add at least one actual photograph.”** The submit code showed this occurred before `uploadPhotos(...)` and before any Storage request.

The cause was identified as a continuity mismatch: basket metadata survived in `localStorage`, but selected browser `File` objects were held only in memory. A login/register redirect or page reload could therefore restore an item without its photographs.

The minimal repair persists the multi-item photo arrays in same-origin IndexedDB when an item is added, restores them on page load and immediately before submit, updates them when an item is removed, and clears them after successful submission.

No Supabase backend configuration was changed.

## External services

- Supabase Auth
- Supabase Storage
- Supabase PostgreSQL/RPC

The Research PC/Ollama system is not part of this customer photo-upload path.

## Verification procedure

After deployment:

1. hard-refresh or open a private/incognito browser window;
2. start a new valuation and attach at least one valid image;
3. add the item to the basket;
4. deliberately pass through the login/account path or refresh before final submission;
5. confirm the basket and photographs are restored;
6. submit the valuation;
7. confirm no local “actual photograph” loss and no **Bucket not found** error;
8. confirm the object exists in `quote-photos`;
9. confirm the created quote item contains photo metadata;
10. confirm existing customer/admin valuation behaviour still works.

If the error persists after current scripts are confirmed loaded, stop changing cache versions and inspect the first failing network request/error instead.


## Customer read-only submission history — 8 September 2026

### User action

From **Valuations received** or **Valuation update**, the customer selects:

**VIEW WHAT YOU SENT**

### Front-end route

`account.html`

→ `account-valuation-view-links.js`

→ `customer-valuation.html?id=<valuation-id>`

→ `customer-valuation.js`.

The account link module maps the current customer's operational records through:

`sales` → `sale_items` → `quote_items` → `valuations`

and also links directly from valuation cards by `quote_reference`.

### Expected data flow

`customer-valuation.js`

→ authenticated session from `auth.js`

→ `valuations` filtered by both requested ID and current customer `user_id`

→ `quote_items`

→ `quote_items.item_data`

→ `quote-photos` signed URLs for the original submitted photographs.

### Expected visible result

The customer sees a **READ ONLY** historical copy of the original submission with:

- product/manufacturer/model identity;
- package;
- category where supplied;
- customer-declared condition;
- missing-item declaration;
- serial number where supplied;
- exception notes;
- submitted photographs where still available.

This is not the staff inspection record and must not display the staff resale condition as if the customer originally declared it.

### First failure points

1. Link injection did not receive current sales/valuation rows.
2. A sale has no linked `sale_items`.
3. A `sale_item.quote_item_id` cannot resolve to the customer's valuation.
4. Customer ownership/RLS blocks the requested valuation.
5. Stored photo metadata is missing or the Storage ownership policy blocks signed URL creation.

### Regression rule

Do not remove the product name from customer progress simply because the operational card is keyed by a sale reference. A sale reference and a valuation reference are operational identifiers; the read-only history view must remain human-readable equipment history.
