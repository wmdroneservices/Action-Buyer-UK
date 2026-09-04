document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const auth = window.actionBuyerAuth;
  if (!auth) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id,active,can_manage_staff")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!staff?.active || !staff?.can_manage_staff) {
    // This script is also loaded on the main staff dashboard. Redirecting to
    // admin.html from admin.html causes an endless reload loop for restricted staff.
    const dangerZone = document.getElementById("management-danger-zone");
    if (dangerZone) dangerZone.hidden = true;
    return;
  }

  const button = document.getElementById("test-reset-button");
  const message = document.getElementById("test-reset-message");
  if (!button) return;

  async function listStorageFiles(prefix = "") {
    const files = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const { data, error } = await auth.supabase.storage
        .from("quote-photos")
        .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });

      if (error) throw error;
      const items = data || [];
      if (!items.length) break;

      for (const item of items) {
        const path = `${prefix}${item.name}`;
        if (item.id === null) {
          const nested = await listStorageFiles(`${path}/`);
          files.push(...nested);
        } else {
          files.push(path);
        }
      }

      if (items.length < limit) break;
      offset += limit;
    }

    return files;
  }

  async function removeQuotePhotos() {
    const paths = await listStorageFiles();
    let removed = 0;

    for (let i = 0; i < paths.length; i += 1000) {
      const batch = paths.slice(i, i + 1000);
      const { data, error } = await auth.supabase.storage
        .from("quote-photos")
        .remove(batch);
      if (error) throw error;
      removed += Array.isArray(data) ? data.length : batch.length;
    }

    return removed;
  }

  button.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "WARNING: This permanently deletes TEST quote workflow data.\n\nThis removes test valuations, quote items, offers, offer events, refusals, queued quote emails, test sales records and quote photographs.\n\nCustomer accounts, staff accounts, catalogue products, pricing and retailer data are NOT deleted.\n\nContinue?"
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "RESETTING...";

    if (message) {
      message.textContent = "Removing test quote photographs...";
      message.className = "form-message";
    }

    try {
      // Storage objects must be removed through the Supabase Storage API,
      // never by deleting rows from storage.objects with SQL.
      const photosRemoved = await removeQuotePhotos();

      if (message) message.textContent = "Removing test quote database records...";

      const { data, error } = await auth.supabase.rpc("reset_test_quote_data");
      if (error) throw error;

      const counts = data || {};
      const databaseTotal = Object.values(counts).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
      const total = databaseTotal + photosRemoved;

      if (message) {
        message.textContent = total
          ? `Test data reset complete. ${total} test records/files removed.`
          : "Test data reset complete. There was no test data to remove.";
        message.className = "form-message success";
      }

      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      console.error("GearCashOut test data reset failed", error);
      if (message) {
        message.textContent = error?.message || "Reset failed.";
        message.className = "form-message error";
      }
      button.disabled = false;
      button.textContent = "CLEAR ALL TEST DATA";
    }
  });
});
