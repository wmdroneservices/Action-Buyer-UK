# Business Mail Sent-folder fix

## Date
2026-09-05

A successful SMTP delivery was not automatically being represented in the GearCashOut **Sent** folder. The recipient could receive the email while the internal mail interface showed Sent as empty.

The `management-mail-v2` Edge Function now:

1. Sends the email through Purelymail SMTP.
2. Locates the mailbox's IMAP Sent folder using the standard `\\Sent` special-use flag, with name fallbacks.
3. Appends a copy of the successfully sent message to that Sent folder.
4. Marks the saved copy as read.

This applies to future messages. Emails sent before this change cannot be reconstructed automatically.

GitHub source and deployed Supabase Edge Function were updated together. Deployed function version: 15.
