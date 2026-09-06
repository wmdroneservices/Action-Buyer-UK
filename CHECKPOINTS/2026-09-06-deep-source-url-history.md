# 2026-09-06 — Deep Source Landing-Page URL History

## Change

The AI Research Centre's **Deep Source / Website Audit** landing-page URL field now keeps a persistent dropdown history on the staff device/browser.

## Behaviour

- Enter a valid full `http://` or `https://` URL.
- The URL is normalised and saved when the field is changed/left and again when the audit starts.
- Previously used URLs appear as dropdown suggestions.
- The most recent URL is first.
- Duplicate URLs are de-duplicated.
- History is capped at 20 entries.

## Safety / data-flow rule

The dropdown is convenience state only. The URL currently selected in the field remains the explicit `deep_source_url` sent to the Deep Source run. Saved history must never silently broaden, override or mix audit sources.

## Files changed

- `admin-ai-research.html`
- `admin-ai-research.js`
- `docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`

## Next related check

Before the next MPB Deep Source test, inspect the interaction between the normal **Source filter** and **RUN DEEP SOURCE AUDIT** so an explicit website audit cannot accidentally broaden into unrelated sources.
