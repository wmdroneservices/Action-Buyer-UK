# 2026-09-05 Staff Business Mail — Mailbox State Consistency Fix

## Issue observed
The Business Mail screen could show one mailbox in the **CURRENT MAILBOX** selector while the sidebar and message list still displayed another mailbox (for example, Gary Martin selected while Info / General Enquiries remained visible).

## Root cause addressed
The front end allowed asynchronous folder/message loads from an earlier mailbox state to complete after the visible selection had changed.

## Fix applied
- Added atomic mailbox activation.
- Every mailbox switch and refresh now increments a mailbox load version.
- Folder and message responses only render if their mailbox ID and version still match the currently selected mailbox.
- Stale responses are discarded instead of overwriting the active mailbox UI.
- Folder buttons are also bound to the mailbox they were rendered for.
- Updated the JavaScript cache version in `admin-mail.html`.

## Related live data check
The database contains three active mailbox records:
- Info / General Enquiries — `info@gearcashout.co.uk`
- Quotes — `quote@gearcashout.co.uk`
- Gary Martin — `gary@gearcashout.co.uk`

These records have distinct mailbox IDs. The inconsistency was therefore treated as a front-end state/race problem rather than duplicate mailbox records.

## Test
Reload the Business Mail page and switch repeatedly between Gary Martin, Info / General Enquiries and Quotes. The selector, sidebar identity, folders and message list should remain tied to the same mailbox at all times.
