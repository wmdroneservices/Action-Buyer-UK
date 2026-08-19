document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const header = document.querySelector(".account-header > div");
  if (!auth || !header) return;
  const session = await auth.getSession();
  if (!session) return;

  const STAFF_USER_ID = "ecb51873-46f8-4468-aa1d-aeda08178fd8";
  if (session.user.id !== STAFF_USER_ID) {
    document.querySelectorAll("[data-account-link]").forEach(link => {
      link.textContent = "My Account";
      link.href = "account.html";
    });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("full_name,account_number")
    .eq("id", session.user.id)
    .maybeSingle();

  const name = profile?.full_name?.trim();
  const accountNumber = profile?.account_number?.trim();
  const welcome = document.getElementById("welcome-text");
  if (welcome) {
    welcome.textContent = name
      ? `Welcome, ${name}.`
      : `Welcome. Signed in as ${session.user.email}`;
  }

  if (!document.getElementById("account-number-display")) {
    const p = document.createElement("p");
    p.id = "account-number-display";
    p.className = "section-kicker";
    p.textContent = `ACCOUNT NUMBER · ${accountNumber || "Not assigned"}`;
    header.insertBefore(p, header.querySelector("h1"));
  }
});
