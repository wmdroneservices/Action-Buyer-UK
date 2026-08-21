document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const panel = document.getElementById('return-cost-panel');
  if (!auth || !panel) return;
  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=quote-return-cost-form.html'; return; }
  const { data: staff } = await auth.supabase.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { panel.innerHTML = '<p>You do not have permission to access customer cases.</p>'; return; }

  const caseId = new URLSearchParams(location.search).get('case_id');
  if (!caseId) { panel.innerHTML = '<p>No customer case selected.</p>'; return; }

  const reasons = window.CaseCostReasons?.CASE_COST_REASONS || {};
  const options = (type) => (reasons[type] || []).map(reason => `<option value="${esc(reason)}">${esc(reason)}</option>`).join('');
  panel.innerHTML = `<h2>Return expense record</h2><p>Record each actual cost separately. These costs remain attached to the customer case and do not create inventory.</p>
    <form id="return-cost-form" class="auth-form">
      <label for="inbound_shipping">Inbound shipping (£)</label><input id="inbound_shipping" name="inbound_shipping" type="number" min="0" step="0.01" value="0">
      <label for="inbound_reason">Inbound shipping reason</label><select id="inbound_reason" name="inbound_reason"><option value="">Select reason</option>${options('Inbound Shipping')}</select>
      <label for="return_shipping">Return shipping (£)</label><input id="return_shipping" name="return_shipping" type="number" min="0" step="0.01" value="0">
      <label for="return_reason">Return shipping reason</label><select id="return_reason" name="return_reason"><option value="">Select reason</option>${options('Return Shipping')}</select>
      <label for="inspection">Inspection (£)</label><input id="inspection" name="inspection" type="number" min="0" step="0.01" value="0">
      <label for="inspection_reason">Inspection reason</label><select id="inspection_reason" name="inspection_reason"><option value="">Select reason</option>${options('Inspection')}</select>
      <label for="packaging">Packaging (£)</label><input id="packaging" name="packaging" type="number" min="0" step="0.01" value="0">
      <label for="packaging_reason">Packaging reason</label><select id="packaging_reason" name="packaging_reason"><option value="">Select reason</option>${options('Packaging')}</select>
      <label for="other">Other costs (£)</label><input id="other" name="other" type="number" min="0" step="0.01" value="0">
      <label for="other_reason">Other cost reason</label><select id="other_reason" name="other_reason"><option value="">Select reason</option>${options('Other')}</select>
      <div id="outcome" class="valuation-card" style="margin-top:1rem"></div>
      <label for="notes">Notes <span class="optional">(optional)</span></label><textarea id="notes" name="notes" rows="4"></textarea>
      <p id="message" class="form-message" role="status" aria-live="polite"></p><button class="btn btn-primary" type="submit">RECORD RETURN COSTS</button>
    </form>`;

  const fields = ['inbound_shipping','return_shipping','inspection','packaging','other'];
  const recalc = () => {
    const costs = window.CaseFinancialLedger.buildRejectedQuoteCaseCosts(Object.fromEntries(fields.map(f => [f, Number(document.getElementById(f).value || 0)])));
    const outcome = window.CaseFinancialLedger.calculateCaseOutcome(costs);
    document.getElementById('outcome').innerHTML = `<p><strong>Total case costs:</strong> £${outcome.totalCosts.toFixed(2)}</p><p><strong>Net case outcome:</strong> £${outcome.netOutcome.toFixed(2)}</p><p><strong>${outcome.isLoss ? 'Loss recorded' : 'No loss recorded'}</strong></p>`;
    return costs;
  };
  fields.forEach(f => document.getElementById(f).addEventListener('input', recalc));
  recalc();

  document.getElementById('return-cost-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('message');
    const costs = recalc();
    if (!costs.length) { message.textContent = 'Enter at least one actual cost.'; message.className='form-message error'; return; }
    const pairs = [['inbound_shipping','inbound_reason','Inbound Shipping'],['return_shipping','return_reason','Return Shipping'],['inspection','inspection_reason','Inspection'],['packaging','packaging_reason','Packaging'],['other','other_reason','Other']];
    for (const [amountField, reasonField, type] of pairs) {
      if (Number(document.getElementById(amountField).value || 0) > 0 && !document.getElementById(reasonField).value) { message.textContent = `Select a reason for ${type}.`; message.className='form-message error'; return; }
    }
    const entries = [];
    for (const [amountField, reasonField, type] of pairs) {
      const amount = Number(document.getElementById(amountField).value || 0);
      if (amount > 0) entries.push(window.CaseFinancialLedger.createCaseFinancialEntry({caseId, type, amount, direction:'cost', description:document.getElementById('notes').value.trim() || null, reference:document.getElementById(reasonField).value, recordedBy:session.user.id}));
    }
    const rows = entries.map(e => ({case_id:e.caseId, cost_type:e.type, amount:e.amount, direction:e.direction, description:e.description, reason:e.reference, recorded_by:e.recordedBy}));
    const { error } = await auth.supabase.from('case_financial_entries').insert(rows);
    if (error) { message.textContent = error.message || 'Could not save return costs.'; message.className='form-message error'; return; }
    message.textContent = 'Return costs recorded against the customer case.'; message.className='form-message success';
  });

  function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
});
