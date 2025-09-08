
<script lang="ts">
  import { onMount } from 'svelte';
  import type { FirestoreTimestamp } from '$lib/classes/FireStoreTimestamp';
  import { Market } from '$lib/classes/Market';
  import { serverFetch } from '$lib/database/dbService';

  let markets: Market[] = [];
  let loading = true;
  let error = '';
  let activeMarkets: Market[] = [];
  let closedMarkets: Market[] = [];

  onMount(async () => {
    try {
      const res = await serverFetch('markets');
      if (!res.ok) throw new Error('Failed to fetch markets');
      markets = await res.json();
      activeMarkets = markets.filter(m => m.status === 'OPEN');
      closedMarkets = markets.filter(m => m.status === 'CLOSED');
    } catch (e) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  });

  function toDate(val: string | FirestoreTimestamp): Date {
    if (typeof val === 'string') {
      return new Date(val);
    }
    if (typeof val === 'object' && '_seconds' in val) {
      return new Date(val._seconds * 1000 + Math.floor(val._nanoseconds / 1e6));
    }
    return new Date();
  }
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
  <h1>Markets</h1>
  <button on:click={() => window.location.href = '/markets/new'} style="padding: 0.5rem 1rem; font-size: 1rem;">Create New Market</button>
</div>

{#if loading}
  <p>Loading markets...</p>
{:else if error}
  <p style="color: red">{error}</p>
{:else}
  <section style="margin-bottom: 2rem;">
    <h2>Active Markets</h2>
    {#if activeMarkets.length === 0}
      <p>No active markets available.</p>
    {:else}
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        {#each activeMarkets as market}
          <div
            style="border: 1px solid #ccc; border-radius: 8px; padding: 1rem; min-width: 250px; background: #fafafa; cursor: pointer; transition: box-shadow 0.2s;"
            on:click={() => window.location.href = `/markets/${market.id}`}
            on:keydown={(e) => { if (e.key === 'Enter') window.location.href = `/markets/${market.id}`; }}
            tabindex="0"
            role="button"
            aria-label={`View market ${market.title}`}
          >
            <h2>{market.title}</h2>
            <p><strong>Open:</strong> {toDate(market.openDate).toLocaleString()}</p>
            <p><strong>Close:</strong> {toDate(market.closeDate).toLocaleString()}</p>
            <p><strong>ID:</strong> {market.id}</p>
          </div>
        {/each}
      </div>
    {/if}
  </section>
  <section>
    <h2>Previous Markets</h2>
    {#if closedMarkets.length === 0}
      <p>No previous markets.</p>
    {:else}
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        {#each closedMarkets as market}
          <div
            style="border: 1px solid #eee; border-radius: 8px; padding: 1rem; min-width: 250px; background: #f5f5f5; cursor: pointer; opacity: 0.7; transition: box-shadow 0.2s;"
            on:click={() => window.location.href = `/markets/${market.id}`}
            on:keydown={(e) => { if (e.key === 'Enter') window.location.href = `/markets/${market.id}`; }}
            tabindex="0"
            role="button"
            aria-label={`View market ${market.title}`}
          >
            <h2>{market.title}</h2>
            <p><strong>Open:</strong> {toDate(market.openDate).toLocaleString()}</p>
            <p><strong>Close:</strong> {toDate(market.closeDate).toLocaleString()}</p>
            <p><strong>ID:</strong> {market.id}</p>
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/if}
