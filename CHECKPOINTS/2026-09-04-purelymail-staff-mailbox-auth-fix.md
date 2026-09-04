# Purelymail staff mailbox authentication fix

## Date
2026-09-04

## Issue
A provisioned staff mailbox could exist successfully in Purelymail but the GearCashOut Business Mail page returned:

`Invalid login: 535 Authentication Failed`

## Root cause
The automatic repair path called Purelymail `modifyUser` using only the local part of the mailbox address (for example `gary`). Purelymail's `modifyUser` API requires the full mailbox username (for example `gary@gearcashout.co.uk`).

## Fix applied
- Updated `supabase/functions/management-mail-v2/index.ts` so automatic staff mailbox password repair uses the full email address.
- Updated `supabase/functions/manage-staff-v2/index.ts` so staff mailbox password resets also use the full email address.
- Deployed:
  - `management-mail-v2` version 14
  - `manage-staff-v2` version 10

## Current verified staff mailbox
- Gary Martin
- `gary@gearcashout.co.uk`
- Database status: provisioned

The next mailbox connection attempt can now repair/synchronise the Purelymail password using the correct full mailbox identifier.
