# Purchasing Inbound Label Confirmation — 9 September 2026

## User requirement

After staff send the Customer → GearCashOut label:

- display **Label sent to customer**;
- provide **RETURN TO PURCHASING DASHBOARD**;
- do not direct staff to Inventory at that stage.

## Investigation

Checked:

1. current project-memory checkpoints;
2. Inventory/Purchasing/Sales Diagnostic Roadmap;
3. current Purchasing page and shared shipment controller;
4. existing inbound receipt gate and previous workflow boundary fixes.

## First actual issue

The shared Purchasing shipment flow saved the shipment and emailed the customer, then reloaded the purchase list. The surrounding workflow/UI could leave staff following an Inventory direction immediately after label creation.

That is the wrong workflow boundary: creating a label does not mean the item has been physically received.

## Correct flow

Customer response
→ Create/send Customer → GearCashOut label
→ Label sent to customer
→ Return to Purchasing Dashboard
→ Await delivery
→ Item received
→ Inventory asset/inspection workflow.

## Repair

In the shared `admin-sales.js` shipment handler, when all of the following are true:

- page is Purchasing context;
- shipment type is `inbound`;
- customer email succeeds;

the page now displays a dedicated confirmation:

**LABEL SENT**

**Label sent to customer**

with:

**RETURN TO PURCHASING DASHBOARD**

The confirmation explains that the next action is to await delivery and record receipt.

## Safety boundary

If the shipment saves but the customer email fails, the success confirmation is not shown. The existing failure message remains so staff do not receive a false “sent to customer” result.

## Verification

Confirmed in current GitHub:

- Purchasing + inbound + email-success gate exists;
- success heading exists;
- button targets `admin-purchasing.html`;
- email-failure message remains;
- Purchasing page cache version was updated.

## Documentation updated

- System Handbook
- AI Operating Manual
- Inventory Repair and Sales Workflow Diagnostic Roadmap
