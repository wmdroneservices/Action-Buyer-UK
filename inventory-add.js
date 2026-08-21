document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const form = document.getElementById("asset-form");
  const message = document.getElementById("asset-message");
  if (!auth || !form) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-add.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { form.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Saving asset…";
    message.className = "form-message";
    const fd = new FormData(form);
    const payload = {
      asset_reference: fd.get("asset_reference").trim(),
      manufacturer: fd.get("manufacturer").trim(),
      model: fd.get("model").trim(),
      serial_number: fd.get("serial_number").trim() || null,
      purchase_price: Number(fd.get("purchase_price")),
      condition_grade: fd.get("condition_grade") || null,
      status: "Awaiting Receipt",
      current_location: fd.get("current_location") || "Received Area",
      notes: fd.get("notes").trim() || null
    };
    const { error } = await auth.supabase.from("inventory_assets").insert(payload);
    if (error) {
      message.textContent = error.message.includes("duplicate") ? "That asset reference is already in use." : "Could not create the asset. Please check the details and try again.";
      message.className = "form-message error";
      return;
    }
    message.textContent = "Asset created successfully and placed into Awaiting Receipt.";
    message.className = "form-message success";
    form.reset();
  });
});
