/* global supabase */

/**
 * Browser adapter for the central asset state machine.
 * Requires asset-state-machine.js to be loaded first and a Supabase client
 * available as window.supabaseClient, window.supabase, or actionBuyerAuth.supabase.
 */
(function () {
  const machine = window.AssetStateMachine;
  if (!machine) return;

  function client() {
    return window.supabaseClient || window.supabase || window.actionBuyerAuth?.supabase;
  }

  async function getAsset(assetId) {
    const db = client();
    if (!db) throw new Error('Supabase client is not available.');
    const { data, error } = await db.from('inventory_assets').select('*').eq('id', assetId).single();
    if (error) throw error;
    return data;
  }

  async function transitionAsset(assetId, nextState, reason = '') {
    const db = client();
    if (!db) throw new Error('Supabase client is not available.');

    const asset = await getAsset(assetId);
    const sessionResult = await db.auth.getSession();
    const userId = sessionResult?.data?.session?.user?.id || null;
    const updated = machine.transitionAsset(asset, nextState, {
      reason,
      changedBy: userId
    });

    const { data, error } = await db
      .from('inventory_assets')
      .update({
        status: updated.status,
        previous_status: updated.previous_status,
        status_changed_at: updated.status_changed_at,
        status_change_reason: updated.status_change_reason,
        status_changed_by: updated.status_changed_by
      })
      .eq('id', assetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  window.AssetStateActions = {
    getAsset,
    transitionAsset,
    allowedNextStates: machine.getAllowedNextStates
  };
})();
