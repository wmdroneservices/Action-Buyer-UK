function calculatePricing({ purchasePrice = 0, additionalCosts = 0, targetSalePrice = 0, sellingFees = 0, shippingCost = 0 } = {}) {
  const cost = Number(purchasePrice) + Number(additionalCosts) + Number(shippingCost);
  const sale = Number(targetSalePrice);
  const fees = Number(sellingFees);
  const netSale = sale - fees;
  const profit = netSale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  return { totalCost: cost, targetSalePrice: sale, sellingFees: fees, netSale, expectedProfit: profit, expectedMarginPercent: Number(margin.toFixed(2)) };
}

function createPricingApproval({ assetId, pricing, approvedBy, notes = null } = {}) {
  if (!assetId) throw new Error('assetId is required');
  if (!approvedBy) throw new Error('approvedBy is required');
  if (!pricing || Number(pricing.targetSalePrice) <= 0) throw new Error('A positive target sale price is required');
  return { assetId, ...pricing, approvedBy, approvedAt: new Date().toISOString(), notes };
}

if (typeof window !== 'undefined') window.PricingApproval = { calculatePricing, createPricingApproval };
if (typeof module !== 'undefined') module.exports = { calculatePricing, createPricingApproval };

// Page workflow
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const panel = document.getElementById('pricing-panel');
  if (!auth || !panel) return;
  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=pricing-approval.html'; return; }
  const { data: staff } = await auth.supabase.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { panel.innerHTML = '<p>You do not have permission to access inventory.</p>'; return; }
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { panel.innerHTML = '<p>No asset selected.</p>'; return; }
  const { data: asset, error } = await auth.supabase.from('inventory_assets').select('*').eq('id', id).single();
  if (error || !asset) { panel.innerHTML = '<p>Asset could not be found.</p>'; return; }
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(value || 0));
  const purchase = Number(asset.purchase_price || 0);
  panel.innerHTML = `<h2>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ') || 'Asset')}</h2><p>Purchase cost: <strong>${money(purchase)}</strong></p><form id="pricing-form" class="auth-form"><label for="additional_costs">Additional costs (£)</label><input id="additional_costs" name="additional_costs" type="number" min="0" step="0.01" value="0"><label for="target_sale_price">Target sale price (£)</label><input id="target_sale_price" name="target_sale_price" type="number" min="0" step="0.01" required><label for="selling_fees">Estimated selling fees (£)</label><input id="selling_fees" name="selling_fees" type="number" min="0" step="0.01" value="0"><label for="shipping_cost">Shipping/collection cost (£)</label><input id="shipping_cost" name="shipping_cost" type="number" min="0" step="0.01" value="0"><div id="pricing-summary" class="valuation-card" style="margin-top:1rem"></div><label for="notes">Approval notes <span class="optional">(optional)</span></label><textarea id="notes" name="notes" rows="4"></textarea><p id="pricing-message" class="form-message" role="status" aria-live="polite"></p><button class="btn btn-primary" type="submit">APPROVE PRICING</button></form>`;
  const form = document.getElementById('pricing-form');
  const summary = document.getElementById('pricing-summary');
  const fields = ['additional_costs','target_sale_price','selling_fees','shipping_cost'];
  const recalc = () => {
    const result = calculatePricing({ purchasePrice: purchase, additionalCosts: Number(form.elements.additional_costs.value || 0), targetSalePrice: Number(form.elements.target_sale_price.value || 0), sellingFees: Number(form.elements.selling_fees.value || 0), shippingCost: Number(form.elements.shipping_cost.value || 0) });
    summary.innerHTML = `<p><strong>Total cost:</strong> ${money(result.totalCost)}</p><p><strong>Net sale:</strong> ${money(result.netSale)}</p><p><strong>Expected profit:</strong> ${money(result.expectedProfit)}</p><p><strong>Expected margin:</strong> ${esc(result.expectedMarginPercent)}%</p>`;
    return result;
  };
  fields.forEach(name => form.elements[name].addEventListener('input', recalc));
  recalc();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('pricing-message');
    const result = recalc();
    if (result.targetSalePrice <= 0) { message.textContent = 'Enter a target sale price before approving.'; message.className='form-message error'; return; }
    if (result.expectedProfit <= 0) { message.textContent = 'The proposed price does not produce a positive expected profit. Review the figures before approving.'; message.className='form-message error'; return; }
    const approval = createPricingApproval({ assetId:id, pricing:result, approvedBy:session.user.id, notes:form.elements.notes.value.trim() || null });
    const { error: saveError } = await auth.supabase.from('inventory_pricing_approvals').insert({ asset_id:id, target_sale_price:approval.targetSalePrice, total_cost:approval.totalCost, selling_fees:approval.sellingFees, shipping_cost:Number(form.elements.shipping_cost.value || 0), expected_profit:approval.expectedProfit, expected_margin_percent:approval.expectedMarginPercent, approved_by:session.user.id, notes:approval.notes });
    if (saveError) { message.textContent = saveError.message || 'Could not save pricing approval.'; message.className='form-message error'; return; }
    message.textContent = 'Pricing approved and recorded.'; message.className='form-message success';
  });
});
