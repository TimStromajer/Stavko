<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { auth } from "$lib/firebase";
  import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let loading = false;
  let error = '';
  let success = '';
  const marketId = get(page).params.id;

  async function confirmMarket(status: 'YES' | 'NO') {
    loading = true;
    error = '';
    success = '';
    try {
      let user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'markets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ marketId, status })
      });
      if (!res.ok) throw new Error('Failed to confirm market');
      success = `Market confirmed as ${status}.`;
    } catch (e) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }
</script>

<h1>Confirm Market</h1>
<p>Market ID: {marketId}</p>

{#if loading}
  <p>Processing...</p>
{:else}
  <button on:click={() => confirmMarket('YES')}>Confirm YES</button>
  <button on:click={() => confirmMarket('NO')}>Confirm NO</button>
{/if}

{#if error}
  <p style="color: red">{error}</p>
{/if}
{#if success}
  <p style="color: green">{success}</p>
{/if}
