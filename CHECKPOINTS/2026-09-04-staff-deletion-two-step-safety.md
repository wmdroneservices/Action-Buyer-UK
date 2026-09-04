# Staff account deletion safety

## Date
2026-09-04

The Staff Management page now uses a deliberate two-step deletion safeguard.

1. Clicking **DELETE STAFF ACCOUNT** does not delete anything.
2. A confirmation dialog opens naming the staff account.
3. The operator must type **DELETE** exactly to enable **PERMANENTLY DELETE ACCOUNT**.
4. Only that final action calls the staff deletion function.

This was added specifically to prevent accidental deletion from the red button in Staff Management.

Relevant files:
- admin-staff-management.js
- admin-staff-management.html
