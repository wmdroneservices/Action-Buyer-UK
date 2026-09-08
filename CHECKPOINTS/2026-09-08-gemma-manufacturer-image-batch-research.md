# Checkpoint — 8 September 2026 — Gemma manufacturer batch image research

## Purpose

Add a controlled AI Research Centre workflow for researching multiple image targets for one manufacturer without mixing image work into pricing/catalogue evidence.

## Verified architecture

### Dashboard
- `admin-ai-research.html`
- `admin-ai-research.js`

New panel:

**Gemma Manufacturer Image Research**

The panel loads canonical manufacturers from the live central image queue, accepts a bounded batch size and creates a manufacturer image-research job.

### Supabase
Authoritative target queue:

- `public.retail_storefront_image_queue`

New job records:

- `public.retail_storefront_image_research_jobs`
- `public.retail_storefront_image_research_job_items`

New staff/worker functions:

- `staff_image_research_manufacturers(...)`
- `staff_image_research_create_manufacturer_job(...)`
- `staff_image_research_manufacturer_jobs(...)`
- `increment_image_research_job_progress(...)`

### Research PC / Gemma
Worker:

- `tools/gear-ai-local-agent/agent.mjs`

The image path runs separately from pricing evidence:

Manufacturer + Category
→ web discovery
→ source-page image extraction
→ Gemma candidate validation
→ exact queue-row revalidation
→ candidate save

## Non-negotiable safety rules

- Deployment key is exact **Manufacturer + Category**.
- Existing approved imagery is never silently overwritten.
- Candidate writes remain:
  - `research_status = candidate`
  - `approved = false`
  - `licence_status = unverified`
- Rights/usage review remains a staff approval step.
- No image result is written into pricing evidence tables or Gemma catalogue evidence candidates.

## Current commits

- Worker: `698c305c59fbd5f9db46925abdc24cf97eca306b`
- Dashboard HTML: `e92f8561d3119c0cbb27144d6b9d1f664ad45b5b`
- Dashboard JS: `eb29dfade1152a9980d3d6f1812a90417c2a07a7`
- Migration record: `926eed9890a66ed997e46cb1e37c7464f3e94ab4`

## Important deployment boundary

The Research PC currently reports online with the existing worker/supervisor. GitHub updates do **not** automatically replace the manually extracted local `agent.mjs`.

Do not interrupt active Gemma/catalogue work to install this change. After the current work is safely complete, update the local worker copy from the verified GitHub version and restart through the established launcher. Then run a small manufacturer batch first and verify the resulting candidate records visually in the central Image Research workspace.
