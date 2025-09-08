<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let users: any[] = [];
  let loading = true;
  let error = '';

  async function fetchLeaderboard() {
    loading = true;
    error = '';
    try {
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'users');
      if (!res.ok) throw new Error('Failed to fetch users');
      users = await res.json();
      users = users
        .map(u => ({ ...u, value: Number(u.value) }))
        .sort((a, b) => b.value - a.value);
    } catch (e) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }

  onMount(fetchLeaderboard);
</script>

<h1>Leaderboard</h1>

{#if loading}
  <p>Loading leaderboard...</p>
{:else if error}
  <p style="color: red">{error}</p>
{:else}
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Name</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      {#each users as user, i}
        <tr>
          <td>{i + 1}</td>
          <td>{user.name || user.email || user.id}</td>
          <td>{user.value}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
