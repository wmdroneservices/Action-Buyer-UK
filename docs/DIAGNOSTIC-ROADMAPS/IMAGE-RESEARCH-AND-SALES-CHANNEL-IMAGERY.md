# Developer Diagnostic Roadmap — Image Research and Sales-Channel Imagery

## Purpose

This roadmap covers the central staff workflow used to research, review and approve imagery for GearCashOut categories, manufacturers, product lines/models and exact catalogue products.

The public sales websites consume approved image data. They do not host staff research tools.

## User action

**Staff Dashboard → Research & Pricing → Image Research**

Entry point:

- `admin-research-pricing.html`
- card: **IMAGE RESEARCH**
- workspace: `admin-image-research.html`

## Front-end path

1. Staff opens `admin-image-research.html`.
2. `auth.js` establishes the Supabase session and applies staff-hour enforcement/activity logging.
3. `admin-image-research.js` checks `staff_users`:
   - `active = true`
   - and either `can_access_research = true` or `can_manage_staff = true`.
4. The workspace calls `staff_retail_image_research_list(...)`.
5. Staff filters/searches the queue and selects a target.
6. Staff records candidate image URL, source page, source name, rights/licence status and notes.
7. Preview is available before approval.
8. Saving calls `staff_retail_image_research_save(...)`.
9. Explicit approval requires:
   - an image URL;
   - `research_status = 'approved'`;
   - `approved = true`.

## Relevant files

- `admin-research-pricing.html` — Research & Pricing entry card.
- `admin-image-research.html` — staff Image Research workspace.
- `admin-image-research.js` — access check, queue loading, filtering, preview and save.
- `staff-navigation.js` — Research dashboard navigation membership/link.
- `auth.js` — shared Supabase session, staff-hour enforcement and activity auditing.

## Supabase data flow

### Staff permission

Table:

- `public.staff_users`

Fields used:

- `user_id`
- `active`
- `can_access_research`
- `can_manage_staff`

### Image queue

Table:

- `public.retail_storefront_image_queue`

The queue is the central research/approval record. It includes the target scope and identity plus image/source metadata, status, approval and notes.

### RPCs

- `public.staff_retail_image_research_list(p_scope, p_status, p_category, p_search, p_limit, p_offset)`
- `public.staff_retail_image_research_save(p_id, p_image_url, p_source_url, p_source_name, p_licence_status, p_research_status, p_approved, p_notes)`

Both are `SECURITY DEFINER` staff workflows and enforce active Research & Pricing access (or staff-management access).

### Security

- Queue access is not exposed as a public staff-tool table endpoint.
- The staff UI uses the controlled RPCs.
- Public storefront repositories are consumers of approved results only.

## External services

Current workflow:

- Manual internet/source research by authorised staff.
- Candidate URLs and source metadata are recorded centrally.

Future enhancement:

- controlled image download/upload and central storage, after a storage design is implemented.

## Expected data flow

`Staff research`
→ `retail_storefront_image_queue`
→ `candidate/review status`
→ `explicit approval`
→ `approved imagery available to sales channels`

## Likely failure points

1. **Staff denied access**
   - Check session.
   - Check `staff_users.active`.
   - Check `can_access_research` / `can_manage_staff`.

2. **Queue fails to load**
   - Check `staff_retail_image_research_list`.
   - Check RPC grants/function definition.
   - Check filter parameters.

3. **Save fails**
   - Check `staff_retail_image_research_save`.
   - Confirm record still exists.
   - Confirm approval rule: URL + approved status.

4. **Public site does not show an approved image**
   - Investigate the consumer query/adapter in that sales channel.
   - Do not add staff tools to the public repository as a workaround.

5. **Wrong image quality or unrelated image**
   - Do not bulk-approve generic search results.
   - Verify the exact category/manufacturer/model/product target before approval.
   - Record source and rights/licence status.

## Known fix history

### 7 September 2026 — repository boundary correction

An Image Research workspace was initially created in the public Retail Storefront repository. This was incorrect because the project architecture keeps all staff operations in `Action-Buyer-UK`.

The misplaced storefront UI was removed.

The feature was rebuilt in:

**Action-Buyer-UK → Staff Dashboard → Research & Pricing → Image Research**

The public Retail Storefront remains website-only and consumes approved data rather than hosting staff operations.


## 8 September 2026 — Manufacturer Batch Image Research

### User action

**Staff Dashboard → Research & Pricing → Image Research → MANUFACTURER BATCH RESEARCH**

### Purpose

The batch workflow is deliberately limited to entity_scope = manufacturer, which is the current priority for Category + Manufacturer coverage. Model/product imagery remains outside this batch workflow because exact product imagery is deferred until a product is actually listed for sale.

### Front-end path

- admin-research-pricing.html exposes the Image Research manufacturer-batch entry.
- admin-image-research.html contains the Individual/Manufacturer Batch mode switch.
- admin-image-research.js loads manufacturers, loads exact manufacturer-scope targets, generates the Gemma research brief and submits reviewed candidate assignments.

### Supabase RPCs

- staff_retail_image_research_manufacturers(...)
- staff_retail_image_research_manufacturer_targets(...)
- staff_retail_image_research_batch_save(...)

### Deployment validation

Every batch assignment is checked server-side against the exact queue record:

queue_id → manufacturer match → category match → candidate save

Approved imagery is protected from batch overwrite. Batch saves force research_status = candidate and approved = false.

### Gemma operating brief and automated path

The generated brief instructs research to use the exact **Manufacturer + Category** key, research each category separately, avoid generic cross-category reuse, prefer official sources, retain rights review and never auto-approve/publicly publish.

The AI Research Centre also has an automated Gemma manufacturer-job workflow using the Research PC worker and dedicated job tables. It follows the same Manufacturer + Category and candidate-only rules.

### Failure checkpoints

1. Manufacturer list missing → check staff_retail_image_research_manufacturers and staff access.
2. Wrong categories loaded → verify entity_scope = manufacturer and exact manufacturer canonical value.
3. Save rejected → inspect manufacturer/category mismatch validation before changing UI.
4. Approved image overwrite attempted → expected server-side rejection/protection.


## Gemma manufacturer batch research path — 8 September 2026

### User action
AI Research Centre → **Gemma Manufacturer Image Research** → choose canonical manufacturer → choose bounded batch size → queue job.

### Front end
- `admin-ai-research.html`
- `admin-ai-research.js`

### Database
- `retail_storefront_image_queue` remains the authoritative image target queue.
- `retail_storefront_image_research_jobs` stores manufacturer batch lifecycle.
- `retail_storefront_image_research_job_items` stores one exact queue target per job item.
- `staff_image_research_manufacturers(...)` supplies canonical dashboard manufacturer choices.
- `staff_image_research_create_manufacturer_job(...)` creates bounded jobs from eligible queue rows.
- `staff_image_research_manufacturer_jobs(...)` supplies staff-visible status.
- `increment_image_research_job_progress(...)` finalises progress counters/status.

### Research PC / Gemma
`tools/gear-ai-local-agent/agent.mjs`

Expected flow:

job item → exact Manufacturer + Category web searches → source-page image extraction → Gemma candidate validation → exact queue-row revalidation → candidate save → job progress update.

### Hard failure guards
- manufacturer mismatch → fail item;
- category mismatch → fail item;
- already approved target → do not overwrite;
- no sufficiently exact candidate → `no_candidate`;
- rights are unknown → remain `candidate`, never auto-approved;
- worker/local deployment stale → GitHub code alone is insufficient; update the Research PC extracted copy and restart through the established launcher.
