
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

<div class="markets-container">
  <!-- Header Section -->
  <div class="header-section">
    <div class="title-group">
      <h1 class="page-title">Markets</h1>
      <p class="page-subtitle">Explore and participate in prediction markets</p>
    </div>
    <button 
      on:click={() => window.location.href = '/markets/new'} 
      class="create-button"
    >
      <svg class="button-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      Create Market
    </button>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading markets...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="error-text">{error}</p>
    </div>
  {:else}
    <!-- Active Markets Section -->
    <section class="markets-section">
      <div class="section-header">
        <h2 class="section-title">Active Markets</h2>
        <div class="status-badge active">
          <div class="status-dot"></div>
          Live
        </div>
      </div>
      
      {#if activeMarkets.length === 0}
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <h3 class="empty-title">No Active Markets</h3>
          <p class="empty-description">There are no active markets at the moment. Check back later or create a new one.</p>
        </div>
      {:else}
        <div class="markets-grid">
          {#each activeMarkets as market}
            <div
              class="market-card active-card"
              on:click={() => window.location.href = `/markets/${market.id}`}
              on:keydown={(e) => { if (e.key === 'Enter') window.location.href = `/markets/${market.id}`; }}
              tabindex="0"
              role="button"
              aria-label={`View market ${market.title}`}
            >
              <div class="card-header">
                <h3 class="card-title">{market.title}</h3>
                <div class="card-status active">Active</div>
              </div>
              
              <div class="card-content">
                <div class="date-info">
                  <div class="date-item">
                    <span class="date-label">Opens</span>
                    <span class="date-value">{toDate(market.openDate).toLocaleString()}</span>
                  </div>
                  <div class="date-item">
                    <span class="date-label">Closes</span>
                    <span class="date-value">{toDate(market.closeDate).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-footer">
                <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Previous Markets Section -->
    <section class="markets-section">
      <div class="section-header">
        <h2 class="section-title">Previous Markets</h2>
        <div class="status-badge closed">
          <div class="status-dot"></div>
          Closed
        </div>
      </div>
      
      {#if closedMarkets.length === 0}
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-4M9 11V9a2 2 0 112 0v2M9 11h6"/>
          </svg>
          <h3 class="empty-title">No Previous Markets</h3>
          <p class="empty-description">No markets have been closed yet.</p>
        </div>
      {:else}
        <div class="markets-grid">
          {#each closedMarkets as market}
            <div
              class="market-card closed-card"
              on:click={() => window.location.href = `/markets/${market.id}`}
              on:keydown={(e) => { if (e.key === 'Enter') window.location.href = `/markets/${market.id}`; }}
              tabindex="0"
              role="button"
              aria-label={`View market ${market.title}`}
            >
              <div class="card-header">
                <h3 class="card-title">{market.title}</h3>
                <div class="card-status closed">Closed</div>
              </div>
              
              <div class="card-content">
                <div class="date-info">
                  <div class="date-item">
                    <span class="date-label">Opened</span>
                    <span class="date-value">{toDate(market.openDate).toLocaleString()}</span>
                  </div>
                  <div class="date-item">
                    <span class="date-label">Closed</span>
                    <span class="date-value">{toDate(market.closeDate).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-footer">
                <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .markets-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  /* Header Section */
  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 3rem;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .title-group {
    flex: 1;
  }

  .page-title {
    font-size: 3rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
    color: white;
    background: linear-gradient(135deg, #fff 0%, #f0f9ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .page-subtitle {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-weight: 400;
  }

  .create-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .create-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
  }

  .button-icon {
    width: 20px;
    height: 20px;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    backdrop-filter: blur(10px);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(102, 126, 234, 0.3);
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-text {
    color: #4b5563;
    font-size: 1.1rem;
    font-weight: 500;
  }

  /* Error State */
  .error-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #dc2626;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }

  .error-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .error-text {
    font-weight: 500;
    margin: 0;
  }

  /* Markets Sections */
  .markets-section {
    margin-bottom: 3rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0 0.5rem;
  }

  .section-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    backdrop-filter: blur(10px);
  }

  .status-badge.active {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .status-badge.closed {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Markets Grid */
  .markets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  /* Market Cards */
  .market-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;
  }

  .market-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .market-card.active-card::before {
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  }

  .market-card.closed-card::before {
    background: linear-gradient(90deg, #9ca3af 0%, #6b7280 100%);
  }

  .market-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }

  .market-card:hover::before {
    opacity: 1;
  }

  .market-card:focus {
    outline: 2px solid #667eea;
    outline-offset: 2px;
  }

  .closed-card {
    opacity: 0.8;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
    line-height: 1.3;
    flex: 1;
  }

  .card-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .card-status.active {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .card-status.closed {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  .card-content {
    margin-bottom: 1rem;
  }

  .date-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .date-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .date-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .date-value {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
    text-align: right;
  }

  .card-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid rgba(229, 231, 235, 0.5);
  }

  .arrow-icon {
    width: 20px;
    height: 20px;
    color: #9ca3af;
    transition: all 0.3s ease;
  }

  .market-card:hover .arrow-icon {
    color: #667eea;
    transform: translateX(4px);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 16px;
    backdrop-filter: blur(10px);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: #d1d5db;
    margin: 0 auto 1.5rem;
    stroke-width: 1.5;
  }

  .empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .empty-description {
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .markets-container {
      padding: 1rem;
    }

    .header-section {
      flex-direction: column;
      align-items: stretch;
      gap: 1.5rem;
      text-align: center;
    }

    .page-title {
      font-size: 2.5rem;
    }

    .markets-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
      text-align: center;
    }

    .date-item {
      flex-direction: column;
      gap: 0.25rem;
      align-items: flex-start;
    }

    .date-value {
      text-align: left;
    }
  }
</style>
