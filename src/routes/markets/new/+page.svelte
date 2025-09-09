<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from "$lib/firebase";
  import { onMount } from 'svelte';
  import { user, userLoading } from '$lib/stores/user';
  import { get } from 'svelte/store';
  import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let title = '';
  let closeDate = '';
  let error = '';
  let success = '';
  let loading = false;
  let isMarketManager = false;
  let checkedAuth = false;

  onMount(() => {
      let unsubscribe = user.subscribe(async (u) => {
        if (u) {
          checkedAuth = false;
          isMarketManager = false;
          const token = await u.getIdTokenResult();
          isMarketManager = Array.isArray(token.claims.roles) && token.claims.roles.includes('marketManager');
          checkedAuth = true;
        } else {
          checkedAuth = true;
          isMarketManager = false;
        }
      });
      return () => unsubscribe();
  });

  async function createMarket() {
    error = '';
    success = '';
    loading = true;
    try {
      if (!title || !closeDate) {
        error = 'Title and close date are required.';
        loading = false;
        return;
      }
      const body = {
        title,
        closeDate: new Date(closeDate),
        openDate: new Date(),
        status: 'OPEN'
      };
      let userObj = auth.currentUser;
      if (!userObj) return;
      const token = await userObj.getIdToken();
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to create market');
      success = 'Market created!';
      setTimeout(() => goto('/'), 1000);
    } catch (e) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }
</script>

{#if !checkedAuth || $userLoading}
  <p>Checking permissions...</p>
{:else if !get(user)}
  <p style="color: red">You must be logged in to access this page.</p>
{:else if !isMarketManager}
  <p style="color: red">You do not have permission to access this page.</p>
{:else}
  <h1>Create New Market</h1>
  <form on:submit|preventDefault={createMarket} style="max-width: 400px; margin: 2rem auto; display: flex; flex-direction: column; gap: 1rem;">
    <label>
      Title:
      <input type="text" bind:value={title} required />
    </label>
    <label>
      Close Date:
      <input type="datetime-local" bind:value={closeDate} required />
    </label>
    <button type="submit" disabled={loading}>Create Market</button>
    {#if error}
      <p style="color: red">{error}</p>
    {/if}
    {#if success}
      <p style="color: green">{success}</p>
    {/if}
  </form>
{/if}
