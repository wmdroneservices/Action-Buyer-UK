document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const header = document.querySelector(".account-header > div");
  if (!auth || !header) return;
  const session = await auth.getSession();
  if (!session) return;
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
