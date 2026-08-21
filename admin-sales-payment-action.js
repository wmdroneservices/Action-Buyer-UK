// GearCashOut - isolated staff payment confirmation helper
// This module deliberately delegates the authoritative state change to Supabase.
async function confirmSellerPayment({ supabase, saleId, paymentReference = null }) {
  if (!supabase) throw new Error('Supabase client is required.');
  if (!saleId) throw new Error('Sale ID is required.');

  const { data, error } = await supabase.rpc('staff_mark_sale_paid_and_create_inventory', {
    p_sale_id: saleId,
    p_payment_reference: paymentReference || null
  });

  if (error) throw new Error(error.message || 'Payment could not be confirmed.');
  return data;
}

if (typeof window !== 'undefined') window.SellerPaymentAction = { confirmSellerPayment };
if (typeof module !== 'undefined') module.exports = { confirmSellerPayment };
