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

  const getUserDisplayName = (user) => user.name || user.email || user.id;

  onMount(fetchLeaderboard);
</script>

<main class="leaderboard">
  <h1 class="title">Leaderboard</h1>

  {#if loading}
    <div class="loading" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p>Loading leaderboard...</p>
    </div>
  {:else if error}
    <div class="error" role="alert">
      <p>{error}</p>
    </div>
  {:else}
    <div class="table-container">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user, i (user.id)}
            <tr class="user-row" class:top-three={i < 3}>
              <td class="rank">
                <span class="rank-number">{i + 1}</span>
                {#if i < 3}
                  <span class="medal" aria-label={i === 0 ? 'Gold medal' : i === 1 ? 'Silver medal' : 'Bronze medal'}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                {/if}
              </td>
              <td class="name">{getUserDisplayName(user)}</td>
              <td class="value">{user.value.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>

<style>
  .leaderboard {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  .title {
    text-align: center;
    margin-bottom: 2rem;
    color: #1a202c;
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    text-align: center;
  }

  .error p {
    color: #dc2626;
    margin: 0;
    font-weight: 500;
  }

  .table-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .leaderboard-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 1rem;
  }

  .leaderboard-table thead {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .leaderboard-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.875rem;
  }

  .leaderboard-table th:first-child {
    text-align: center;
    width: 100px;
  }

  .leaderboard-table th:last-child {
    text-align: right;
  }

  .user-row {
    border-bottom: 1px solid #f3f4f6;
    transition: background-color 0.2s ease;
  }

  .user-row:hover {
    background-color: #f8fafc;
  }

  .user-row.top-three {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  }

  .user-row:last-child {
    border-bottom: none;
  }

  .leaderboard-table td {
    padding: 1rem;
    color: #374151;
  }

  .rank {
    text-align: center;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .rank-number {
    font-size: 1.125rem;
  }

  .medal {
    font-size: 1.25rem;
  }

  .name {
    font-weight: 500;
    color: #1f2937;
  }

  .value {
    text-align: right;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    color: #059669;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .leaderboard {
      padding: 1rem 0.5rem;
    }

    .title {
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }

    .leaderboard-table th,
    .leaderboard-table td {
      padding: 0.75rem 0.5rem;
    }

    .leaderboard-table th {
      font-size: 0.75rem;
    }

    .table-container {
      border-radius: 8px;
    }
  }
</style>
