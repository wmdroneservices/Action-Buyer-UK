document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const form = document.getElementById("asset-form");
  const message = document.getElementById("asset-message");
  const packageSelect = document.getElementById("package_name");
  const packageSummary = document.getElementById("package-summary");
  const modelInput = document.getElementById("model");
  if (!auth || !form) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-add.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { form.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }

  const updatePackageSummary = () => {
    const model = modelInput.value.trim();
    const packageName = packageSelect.value;
    const spec = window.PackageSpecifications?.getPackageSpecification(model, packageName);
    if (!packageName) { packageSummary.textContent = ""; return; }
    if (!spec) {
      packageSummary.textContent = "No exact package specification is configured for this model. Select Other / Unknown if the package cannot be identified.";
      return;
    }
    packageSummary.textContent = `Selected package: ${spec.package}. Expected batteries: ${spec.expectedBatteries}.`;
  };

  modelInput.addEventListener("input", updatePackageSummary);
  packageSelect.addEventListener("change", updatePackageSummary);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Saving asset…";
    message.className = "form-message";
    const fd = new FormData(form);
    const model = fd.get("model").trim();
    const packageName = fd.get("package_name");
    const spec = window.PackageSpecifications?.getPackageSpecification(model, packageName);

    if (packageName && packageName !== "Other / Unknown" && !spec) {
      message.textContent = "No exact package specification is configured for this model. Please use Other / Unknown or add the package specification first.";
      message.className = "form-message error";
      return;
    }

    const payload = {
      asset_reference: fd.get("asset_reference").trim(),
      manufacturer: fd.get("manufacturer").trim(),
      model,
      package_name: packageName || null,
      expected_battery_count: spec?.expectedBatteries ?? null,
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
    updatePackageSummary();
  });
});
