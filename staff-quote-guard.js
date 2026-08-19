document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const form = document.getElementById("quote-form");
  if (!auth || !form) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff, error } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !staff) return;

  const notice = document.createElement("div");
  notice.className = "notice";
  notice.style.marginBottom = "1rem";
  notice.innerHTML = "<strong>Staff account detected.</strong><p>This staff login cannot be used to submit a customer valuation. Sign out and use a separate customer account for testing customer submissions.</p><a class=\"btn btn-primary\" href=\"admin.html\">RETURN TO STAFF DASHBOARD</a>";
  form.parentNode.insertBefore(notice, form);
  form.hidden = true;

  document.addEventListener("click", event => {
    const button = event.target?.closest?.("#quote-form button");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
});
