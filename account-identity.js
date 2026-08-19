document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const header = document.querySelector(".account-header > div");
  if (!auth || !header) return;
  const session = await auth.getSession();
  if (!session) return;

  // This page is customer-only. Ensure the shared navigation cannot expose
  // the staff dashboard to a customer while the old test staff_users row is
  // being cleaned up.
  const STAFF_USER_ID = "ecb51873-46f8-4468-aa1d-aeda08178fd8";
  if (session.user.id !== STAFF_USER_ID) {
    document.querySelectorAll("[data-account-link]").forEach(link => {
      link.textContent = "My Account";
      link.href = "account.html";
    });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_number")
    .eq("id", session.user.id)
    .maybeSingle();
  if (!profile?.account_number || document.getElementById("account-number-display")) return;
  const p = document.createElement("p");
  p.id = "account-number-display";
  p.className = "section-kicker";
  p.textContent = `ACCOUNT NUMBER · ${profile.account_number}`;
  header.insertBefore(p, header.querySelector("h1"));
});
