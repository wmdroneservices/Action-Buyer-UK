# Business Mail investigation checkpoint

## Date
2026-09-05

## Issue under investigation
Gary Martin's mailbox (`gary@gearcashout.co.uk`) can send email successfully and the recipient receives it, but the GearCashOut Business Mail interface still shows the Gary mailbox's **Sent** folder as empty. Other configured mailboxes show Sent messages correctly.

A separate intermittent symptom has also occurred: after a page refresh or mailbox switch, the selected mailbox can require another refresh before loading.

## Checks completed

### 1. Repository and live deployment
- Repository checked: `wmdroneservices/Action-Buyer-UK`.
- Live Supabase project checked: `Action Buyer UK` (`npdpopaoazbpmwsgyosp`).
- Live Edge Function: `management-mail-v2`.
- Live function is ACTIVE and currently version 21.
- The live function source matches the current GitHub implementation examined during this investigation.

### 2. Mailbox database records
Checked `business_mailboxes`.

Active mailboxes are:
- `info@gearcashout.co.uk` — Info / General Enquiries — management.
- `quote@gearcashout.co.uk` — Quotes — shared.
- `gary@gearcashout.co.uk` — Gary Martin — staff, Purelymail provisioned.

Gary's mailbox has its own distinct mailbox ID and is marked:
- active = true
- mailbox_type = staff
- purelymail_provisioned = true
- purelymail_status = provisioned

There is no duplicate Gary mailbox record.

### 3. Staff configuration
Checked `staff_users`.

The Gary Martin staff record is active and has:
- can_manage_staff = true
- can_access_mail = true
- business_email = gary@gearcashout.co.uk

Therefore Gary is not being blocked by mailbox permissions.

### 4. Current mailbox-selection frontend
Checked `admin-mail.js`.

Current logic:
- stores the selected mailbox ID in sessionStorage;
- restores that mailbox after page reload;
- increments a mailbox-load version on every activation;
- rejects stale folder/message responses;
- explicitly synchronises the dropdown to the active mailbox.

Recent commits already addressed stale mailbox rendering and mailbox selection:
- `e87d490` — Fix mailbox switch state and stale mail rendering.
- `216574d` — Stabilise Business Mail mailbox selection and refresh state.
- `2f5f836` — Refresh Business Mail client cache version.

These checks should not be repeated unless the code changes again.

### 5. Sent-message backend flow
Checked `management-mail-v2/index.ts`.

For every mailbox, the send flow is:
1. Resolve the selected mailbox by mailbox ID.
2. Resolve that mailbox's SMTP/IMAP credentials.
3. Send through that mailbox's SMTP account.
4. Connect to that same mailbox by IMAP.
5. Locate its Sent folder using \\Sent special-use or name fallbacks.
6. Create a Sent folder if none exists.
7. Append a copy of the sent message.
8. Return `savedToSent` and the exact `sentFolder` path.

Gary does not have a separate Sent-folder code path. Staff mailboxes use the same `saveToSent()` function as the other mailboxes.

### 6. Sent-message retrieval
Checked the current messages reader.

The reader:
- opens the requested folder for the requested mailbox ID;
- uses UID SEARCH as the primary source of truth;
- fetches matching messages by UID;
- has a sequence-based fallback.

This retrieval logic is shared by all mailboxes.

### 7. Prior theory that has already been checked
The following explanation is no longer sufficient on its own and should not simply be repeated:
- “Gary has no Sent folder.”
- “Purelymail STATUS=0 is the only problem.”
- “The UI is just showing another mailbox's Sent folder.”

The code now explicitly creates a Sent folder if required and uses UID SEARCH to avoid relying only on STATUS counts.

## Current strongest finding

Gary is the only mailbox using the dynamically provisioned **staff mailbox credential path**:

```
if(box.mailbox_type==="staff" && box.purelymail_provisioned){
  const pass=await staffMailboxPassword(box.email_address);
  return {
    smtpUser:box.email_address,
    smtpPass:pass,
    imapUser:box.email_address,
    imapPass:pass
  };
}
```

The other working mailboxes use separately configured environment credentials.

Therefore the remaining investigation should focus on verifying the actual IMAP state of the dynamically provisioned Gary mailbox and confirming:
- the exact folders returned for Gary;
- the exact Sent path selected by `saveToSent()`;
- whether APPEND is visible immediately after completion;
- whether a second Sent-like folder exists;
- whether the reader is opening the same exact path returned by the save operation.

## Next checks — not yet completed
1. Add or use a safe authenticated diagnostic path to inspect Gary's actual IMAP folder list and counts.
2. Verify the exact path returned immediately after saving a sent message.
3. Verify that the same path is used by the subsequent message reader.
4. Check for multiple Sent-like folders or namespace differences.
5. If APPEND reports success but the message cannot be read back from the same connection, replace the save logic with immediate post-append verification and explicit UID retrieval.

## Investigation rule
Before making another speculative fix, compare the next finding against this checkpoint so completed checks are not repeated.
