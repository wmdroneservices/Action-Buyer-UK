document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("testing-form");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-testing.html"; return; }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "No permission."; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { box.innerHTML = "No asset selected."; return; }

  const { data: asset } = await auth.supabase.from("inventory_assets").select("manufacturer,model").eq("id", id).single();

  box.innerHTML = `<h2>${asset?.manufacturer || ""} ${asset?.model || "Asset"}</h2>
  <form id="test-form" class="auth-form">
  <label>Flight test</label><select name="flight"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select>
  <label>Camera test</label><select name="camera"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select>
  <label>Battery health</label><select name="battery"><option>Good</option><option>Fair</option><option>Requires Replacement</option></select>
  <label>Notes</label><textarea name="notes"></textarea>
  <button class="btn btn-primary">SAVE TEST</button></form>`;

  document.getElementById("test-form").addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await auth.supabase.from("inventory_testing").insert({
      asset_id: id,
      flight_test: fd.get("flight"),
      camera_test: fd.get("camera"),
      battery_health: fd.get("battery"),
      notes: fd.get("notes")
    });
    if (!error) e.target.innerHTML = "Testing record saved.";
  });
});
