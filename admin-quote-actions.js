document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  const archiveButton = document.getElementById("archive-quote");
  const deleteButton = document.getElementById("delete-quote");
  const message = document.getElementById("admin-message");
  const setMessage = (text, ok = true) => { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); };

  const { data: valuation, error } = await auth.supabase.from("valuations").select("id,quote_reference,archived_at").eq("id", id).maybeSingle();
  if (error || !valuation) return;

  const refresh = () => {
    const archived = !!valuation.archived_at;
    if (archiveButton) {
      archiveButton.textContent = archived ? "RESTORE" : "ARCHIVE";
      archiveButton.classList.toggle("btn-secondary", true);
      archiveButton.dataset.action = archived ? "restore" : "archive";
    }
  };

  if (archiveButton) archiveButton.onclick = async () => {
    const archived = !!valuation.archived_at;
    const action = archived ? "restore" : "archive";
    if (!confirm(`${action === "archive" ? "Archive" : "Restore"} quote ${valuation.quote_reference}?`)) return;
    archiveButton.disabled = true;
    const { error: actionError } = await auth.supabase.rpc(archived ? "staff_restore_valuation" : "staff_archive_valuation", { p_valuation_id: id });
    archiveButton.disabled = false;
    if (actionError) { setMessage(actionError.message || "The quote could not be updated.", false); return; }
    if (archived) {
      window.location.href = "admin-valuations.html";
      return;
    }
    valuation.archived_at = new Date().toISOString();
    setMessage(`Quote ${valuation.quote_reference} has been archived.`);
    refresh();
  };

  if (deleteButton) deleteButton.onclick = async () => {
    if (!confirm(`PERMANENTLY DELETE quote ${valuation.quote_reference}? This removes the quote and its linked items, offers and offer history. This cannot be undone.`)) return;
    deleteButton.disabled = true;
    const { error: deleteError } = await auth.supabase.rpc("staff_delete_valuation", { p_valuation_id: id });
    if (deleteError) { deleteButton.disabled = false; setMessage(deleteError.message || "The quote could not be deleted.", false); return; }
    window.location.href = "admin-valuations.html";
  };

  refresh();
});
