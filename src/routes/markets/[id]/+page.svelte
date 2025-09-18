<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import type { FirestoreTimestamp } from '$lib/classes/FireStoreTimestamp';
  import type { Order } from '$lib/classes/Order';
  import { auth } from "$lib/firebase";
  import { user, userLoading } from "$lib/stores/user";
  import { goto } from '$app/navigation';
  import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let yesOrders: Order[] = $state([]);
  let noOrders: Order[] = $state([]);
  let loading = $state(true);
  let error = $state('');

  let showModal = $state(false);
  let modalType: 'YES' | 'NO' = $state('YES');
  let modalPrice = $state(0.5);
  let modalAmount = $state(1);
  let loginUserId = $state($user ? $user.uid : null);
  let modalError = $state('');

  let holdingsYes = $state(0);
  let holdingsNo = $state(0);
  let userValue = $state(0);

  let showSellModal = $state(false);
  let sellType: 'YES' | 'NO' = $state('YES');
  let sellPrice = $state(0.5);
  let sellAmount = $state(1);
  let sellError = $state('');

  let marketStatus = $state('OPEN');

  // graph
  let chartContainer = $state();
  //let points = $state('');
  let ordersData = $state([]);
  let width = $state(800);
  let height = $state(300);
  let padding = $state(40);
  let minDate = $state(0);
  let maxDate = $state(0);
  let yTicks = Array.from({ length: 11 }, (_, i) => i * 0.1);
  let xTicks = $state([]);

  function toDate(val: FirestoreTimestamp): Date {
    if (typeof val === 'object' && '_seconds' in val) {
      return new Date(val._seconds * 1000 + Math.floor(val._nanoseconds / 1e6));
    }
    return new Date();
  }

  async function fetchHoldings() {
    holdingsYes = 0;
    holdingsNo = 0;
    if (!loginUserId) return;
    const marketId = get(page).params.id;
    try {
      let user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(PUBLIC_FUNCTIONS_URL + `holdings?marketId=${marketId}&userId=${loginUserId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch holdings');
      const holdings = await res.json();
      for (const h of holdings) {
        if (h.type === 'YES') holdingsYes += h.amount;
        if (h.type === 'NO') holdingsNo += h.amount;
      }
    } catch (e) {
      // Optionally handle error
    }
  }

  onMount(() => {
    let unsubscribeUser: () => void;
    let unsubscribeLoading: () => void;

    unsubscribeLoading = userLoading.subscribe((loadingAuth) => {
      if (loadingAuth) {
        // Still waiting for Firebase to resolve initial auth state
        return;
      }

      // Once auth is done loading, then listen for user changes
      unsubscribeUser = user.subscribe(async (u) => {
        console.log("User changed:", u);
        loading = true;
        error = "";

        if (u && u.uid) {
          loginUserId = u.uid;
        } else {
          // signed out case — clear/reset data here if needed
          loginUserId = null;
        }
        await getOrders();
        await fetchHoldings();
        await getUserValue();
        await createGraph();
        updateDimensions();

        loading = false;
      });
    });

    const resizeHandler = () => updateDimensions();
    window.addEventListener("resize", resizeHandler);

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeLoading) unsubscribeLoading();
      window.removeEventListener("resize", resizeHandler);
    };
  });

  $effect(() => {
    if (chartContainer) {
      updateDimensions();
    }
  });

  async function createGraph() {
    const data = await ordersGraphData();
    ordersData = data;
    
    if (data.length > 0) {
      minDate = Math.min(...data.map(d => d.date));
      maxDate = Math.max(...data.map(d => d.date));
      
      if (minDate && maxDate && minDate !== maxDate) {
        let step = (maxDate - minDate) / 4; // 4 intervals = 5 ticks
        xTicks = Array.from({ length: 5 }, (_, i) => minDate + i * step);
        if (xTicks[xTicks.length - 1] !== maxDate) {
          xTicks.push(maxDate); // ensure last date included
        }
      } else {
        xTicks = [minDate]; // fallback for single data point
      }
    } else {
      minDate = 0;
      maxDate = 0;
      xTicks = [];
    }
  }

  const updateDimensions = () => {
    if (chartContainer) {
      const containerWidth = chartContainer.offsetWidth;
      width = Math.max(300, containerWidth); // 32px for padding
      height = Math.max(200, width * 0.4); // Maintain aspect ratio
      padding = width < 500 ? 30 : 40; // Smaller padding on mobile
    }
  };

  function formatDate(d) {
    return new Date(d).getDate() + '.' + (new Date(d).getMonth() + 1);
  }

  let scaleDate = $derived((date) => {
    if (!minDate || !maxDate || minDate === maxDate) return padding;
    return padding + ((date - minDate) / (maxDate - minDate)) * (width - 2 * padding);
  });

  let scalePrice = $derived((price) => {
    return height - padding - price * (height - 2 * padding);
  });

  let points = $derived(() => {
    if (!ordersData.length) return '';
    return ordersData.map(d => `${scaleDate(d.date)},${scalePrice(d.price)}`).join(" ");
  });

  async function ordersGraphData() {
    const previousOrders = await getPreviousOrders();
    const data = previousOrders.map(o => ({
      date: toDate(o.lastChangeDate),
      price: o.action === 'BUY' ? (o.type === 'YES' ? 1 - o.price : o.price) : (o.type === 'YES' ? o.price : 1 - o.price)
    })).sort((a, b) => a.date - b.date);
    return data;
  }

  async function getPreviousOrders() {
    try {
      const marketId = get(page).params.id;
      const res = await fetch(PUBLIC_FUNCTIONS_URL + `orders?marketId=${marketId}&status=ACCEPTED`);
      if (!res.ok) throw new Error('Failed to fetch previous orders');
      const orders: Order[] = await res.json();
      return orders;
    } catch (e) {
      return [];
    }
  }

  async function getOrders() {
    try {
      const marketId = get(page).params.id;
      // Fetch market status
      const marketRes = await fetch(PUBLIC_FUNCTIONS_URL + `markets?marketId=${marketId}`);
      if (marketRes.ok) {
        const marketArr = await marketRes.json();
        if (marketArr && marketArr[0] && marketArr[0].status) {
          marketStatus = marketArr[0].status;
        }
      }
      const res = await fetch(PUBLIC_FUNCTIONS_URL + `orders?marketId=${marketId}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const orders: Order[] = await res.json();
      // BUY orders: YES to NO column (1-price), NO to YES column (1-price)
      const buyOrders = orders.filter(o => o.action === 'BUY' && o.status === 'PENDING');
      const buyNoOrders = buyOrders
        .filter(o => o.type === 'YES')
        .map(o => ({ ...o, price: (1 - o.price).toFixed(2) }));
      const buyYesOrders = buyOrders
        .filter(o => o.type === 'NO')
        .map(o => ({ ...o, price: (1 - o.price).toFixed(2) }));

      // SELL orders: YES to YES column (price as is), NO to NO column (price as is)
      const sellOrders = orders.filter(o => o.action === 'SELL' && o.status === 'PENDING');
      const sellYesOrders = sellOrders.filter(o => o.type === 'YES');
      const sellNoOrders = sellOrders.filter(o => o.type === 'NO');

      yesOrders = [...buyYesOrders, ...sellYesOrders].sort((a, b) => a.price - b.price);
      noOrders = [...buyNoOrders, ...sellNoOrders].sort((a, b) => a.price - b.price);
    } catch (e) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }

  async function getUserValue() {
    try {
      const res = await fetch(PUBLIC_FUNCTIONS_URL + `users?userId=${loginUserId}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      const user = await res.json();
      userValue = user[0].value
    } catch (e) {
      return null;
    }
  }

  function openOrderModal() {
    modalType = 'YES';
    modalPrice = 0.5;
    modalAmount = 1;
    modalError = '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function submitOrder() {
    modalError = '';
    if (modalPrice < 0 || modalPrice > 1) {
      modalError = 'Price must be between 0 and 1.';
      return;
    }
    if (modalAmount < 1) {
      modalError = 'Amount must be at least 1.';
      return;
    }
    if (!$user) {
      modalError = 'You must be logged in to create an order.';
      return;
    }
    const marketId = get(page).params.id;
    const order = {
      marketId,
      type: modalType,
      action: 'BUY',
      amount: Number(modalAmount),
      price: Number(modalPrice),
      userId: $user.uid
    };
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch(PUBLIC_FUNCTIONS_URL + 'orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(order)
        });
        if (!res.ok) throw new Error('Failed to create order');
        closeModal();
        await getOrders();
      }
    } catch (e) {
      modalError = e.message || 'Unknown error';
    }
  }

  function openSellModal() {
    sellType = 'YES';
    sellPrice = 0.5;
    sellAmount = 1;
    sellError = '';
    showSellModal = true;
  }

  function closeSellModal() {
    showSellModal = false;
  }

  async function submitSellOrder() {
    sellError = '';
    if (sellPrice < 0 || sellPrice > 1) {
      sellError = 'Price must be between 0 and 1.';
      return;
    }
    if (sellAmount < 1) {
      sellError = 'Amount must be at least 1.';
      return;
    }
    if (!$user) {
      sellError = 'You must be logged in to create an order.';
      return;
    }
    const marketId = get(page).params.id;
    const order = {
      marketId,
      type: sellType,
      action: 'SELL',
      amount: Number(sellAmount),
      price: Number(sellPrice),
      userId: $user.uid
    };
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch(PUBLIC_FUNCTIONS_URL + 'orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(order)
        });
        if (!res.ok) throw new Error('Failed to create sell order');
        closeSellModal();
        await getOrders();
      }
    } catch (e) {
      sellError = e.message || 'Unknown error';
    }
  }

  async function cancelOrder(orderId: string) {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch(PUBLIC_FUNCTIONS_URL + `orders`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ orderId, orderAction: 'CANCEL', userId: user.uid })
        });
        if (!res.ok) throw new Error('Failed to cancel order');
        await getOrders();
      }
    } catch (e) {
      alert(e.message || 'Unknown error');
    }
  }

  async function acceptOrder(orderId: string) {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch(PUBLIC_FUNCTIONS_URL + `orders`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ orderId, orderAction: 'ACCEPT', userId: user.uid })
        });
        if (!res.ok) throw new Error('Failed to accept order');
        await getOrders();
        await fetchHoldings();
        await getUserValue();
      }
    } catch (e) {
      alert(e.message || 'Unknown error');
    }
  }
</script>

<div class="orders-container">
  <div class="page-header">
    <h1 class="page-title">Market Orders</h1>
    <div class="market-status-indicator">
      <div class="status-dot {marketStatus === 'CLOSED' ? 'closed' : 'active'}"></div>
      <span class="status-text">{marketStatus === 'CLOSED' ? 'Market Closed' : 'Market Active'}</span>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading orders...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p class="error-text">{error}</p>
    </div>
  {:else}
    <div class="orders-grid">
      <!-- YES Orders Section -->
      <div class="orders-section yes-section">
        <div class="section-header">
          <h2 class="section-title">YES Orders</h2>
          <div class="orders-badge yes-badge">{yesOrders.length}</div>
        </div>
        
        {#if yesOrders.length === 0}
          <div class="empty-orders">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <p class="empty-text">No YES buy orders</p>
          </div>
        {:else}
          <div class="orders-table-container">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {#each yesOrders as order}
                  <tr class="order-row">
                    <td class="price-cell">{order.price}</td>
                    <td class="amount-cell">{order.amount}</td>
                    <td class="user-cell">{order.userId}</td>
                    <td class="date-cell">{toDate(order.placedDate).toLocaleString()}</td>
                    <td class="action-cell">
                      {#if order.userId === loginUserId}
                        <button aria-label="Cancel order" on:click={() => cancelOrder(order.id)} class="action-button cancel-button" title="Cancel Order">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      {:else}
                        <button aria-label="Accept order" on:click={() => acceptOrder(order.id)} class="action-button accept-button" title="Accept Order">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- NO Orders Section -->
      <div class="orders-section no-section">
        <div class="section-header">
          <h2 class="section-title">NO Orders</h2>
          <div class="orders-badge no-badge">{noOrders.length}</div>
        </div>
        
        {#if noOrders.length === 0}
          <div class="empty-orders">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <p class="empty-text">No NO buy orders</p>
          </div>
        {:else}
          <div class="orders-table-container">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {#each noOrders as order}
                  <tr class="order-row">
                    <td class="price-cell">{order.price}</td>
                    <td class="amount-cell">{order.amount}</td>
                    <td class="user-cell">{order.userId}</td>
                    <td class="date-cell">{toDate(order.placedDate).toLocaleString()}</td>
                    <td class="action-cell">
                      {#if order.userId === loginUserId}
                        <button aria-label="Cancel order" disabled={!loginUserId} on:click={() => cancelOrder(order.id)} class="action-button cancel-button" title="Cancel Order">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      {:else}
                        <button aria-label="Accept order" disabled={!loginUserId} on:click={() => acceptOrder(order.id)} class="action-button accept-button" title="Accept Order">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>

    {#if loginUserId}
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button on:click={openOrderModal} disabled={marketStatus === 'CLOSED'} class="primary-button">
          <svg class="button-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Create Order
        </button>
        <button on:click={() => goto(`/markets/${get(page).params.id}/confirm`)} disabled={marketStatus === 'CLOSED'} class="secondary-button">
          <svg class="button-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Confirm Market
        </button>
      </div>
    {/if}
  
      <!-- Price Chart Section -->
      <div class="chart-section">
        <h3 class="chart-title">Price History</h3>
        <div class="chart-container" bind:this={chartContainer}>
          <svg {width} {height} class="price-chart">
            <!-- X axis -->
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151"/>

            <!-- Y axis -->
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151"/>

            <!-- Y axis ticks, labels, and grid lines -->
            {#each yTicks as t}
              <line
                x1={padding - 5}
                y1={scalePrice(t)}
                x2={padding}
                y2={scalePrice(t)}
                stroke="#374151"
              />
              <text
                x={padding - 10}
                y={scalePrice(t) + 4}
                font-size="11"
                text-anchor="end"
                fill="#ffffff"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
              >
                {t.toFixed(1)}
              </text>
              <line
                x1={padding}
                y1={scalePrice(t)}
                x2={width - padding}
                y2={scalePrice(t)}
                stroke="#e5e7eb"
                stroke-dasharray="3,3"
                stroke-width="0.5"
              />
            {/each}

            <!-- X axis ticks, labels, and grid lines -->
            {#each xTicks as d}
              <line
                x1={scaleDate(d)}
                y1={height - padding}
                x2={scaleDate(d)}
                y2={height - padding + 5}
                stroke="#374151"
              />
              <text
                x={scaleDate(d)}
                y={height - padding + 18}
                font-size="11"
                text-anchor="middle"
                fill="#ffffff"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
              >
                {formatDate(d)}
              </text>
              <line
                x1={scaleDate(d)}
                y1={padding}
                x2={scaleDate(d)}
                y2={height - padding}
                stroke="#e5e7eb"
                stroke-dasharray="3,3"
                stroke-width="0.5"
              />
            {/each}

            <!-- Line with gradient -->
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.7" />
                <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.7" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <polyline fill="none" stroke="url(#priceGradient)" stroke-width="3" points={points()} filter="url(#glow)" />

            <!-- Data points -->
            {#each ordersData as d}
              <circle cx={scaleDate(d.date)} cy={scalePrice(d.price)} r="1" fill="#667eea" stroke="white" stroke-width="3" class="data-point" />
            {/each}
          </svg>
        </div>
      </div>

      <!-- Holdings Section -->
      {#if loginUserId}
      <div class="holdings-section">
        <h3 class="holdings-title">Your Holdings</h3>
        <div class="holdings-grid">
          <div class="holding-card value-card">
            <div class="holding-label">Total Value</div>
            <div class="holding-value">{userValue}</div>
          </div>
          <div class="holding-card yes-card">
            <div class="holding-label">YES Shares</div>
            <div class="holding-value">{holdingsYes}</div>
          </div>
          <div class="holding-card no-card">
            <div class="holding-label">NO Shares</div>
            <div class="holding-value">{holdingsNo}</div>
          </div>
        </div>
      </div>

      <!-- Sell Button -->
      <div class="sell-section">
        <button on:click={openSellModal} disabled={marketStatus === 'CLOSED'} class="sell-button">
          <svg class="button-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          Sell Holdings
        </button>
      </div>
    {/if}
  {/if}

  <!-- Create Order Modal -->
  {#if showModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Create Order</h2>
          <button on:click={closeModal} class="modal-close" aria-label="Close">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        
        <form on:submit|preventDefault={submitOrder} class="modal-form">
          <div class="form-group">
            <label class="form-label">Order Type</label>
            <select bind:value={modalType} required class="form-select">
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Price (0-1)</label>
            <input type="number" min="0" max="1" step="0.01" bind:value={modalPrice} required class="form-input" />
          </div>
          
          <div class="form-group">
            <label class="form-label">Amount</label>
            <input type="number" min="1" step="1" bind:value={modalAmount} required class="form-input" />
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="confirm-button">Confirm Order</button>
            <button type="button" on:click={closeModal} class="cancel-button-modal">Cancel</button>
          </div>
          
          {#if modalError}
            <div class="form-error">
              <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>{modalError}</span>
            </div>
          {/if}
        </form>
      </div>
    </div>
  {/if}

  <!-- Sell Modal -->
  {#if showSellModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Sell Holdings</h2>
          <button on:click={closeSellModal} class="modal-close" aria-label="Close Sell Modal">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        
        <form on:submit|preventDefault={submitSellOrder} class="modal-form">
          <div class="form-group">
            <label class="form-label">Share Type</label>
            <select bind:value={sellType} required class="form-select">
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Price (0-1)</label>
            <input type="number" min="0" max="1" step="0.01" bind:value={sellPrice} required class="form-input" />
          </div>
          
          <div class="form-group">
            <label class="form-label">Amount</label>
            <input type="number" min="1" step="1" bind:value={sellAmount} required class="form-input" />
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="confirm-button">Confirm Sale</button>
            <button type="button" on:click={closeSellModal} class="cancel-button-modal">Cancel</button>
          </div>
          
          {#if sellError}
            <div class="form-error">
              <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>{sellError}</span>
            </div>
          {/if}
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .orders-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  /* Page Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .page-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0;
    color: white;
    background: linear-gradient(135deg, #fff 0%, #f0f9ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .market-status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    font-weight: 600;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-dot.active {
    background: #10b981;
  }

  .status-dot.closed {
    background: #ef4444;
  }

  .status-text {
    color: white;
    font-size: 0.95rem;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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

  /* Orders Grid */
  .orders-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
  }

  /* Orders Section */
  .orders-section {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 2rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: hidden;
  }

  .orders-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  }

  .no-section::before {
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .orders-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .yes-badge {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .no-badge {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* Empty Orders */
  .empty-orders {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    color: #d1d5db;
    margin-bottom: 1rem;
    stroke-width: 1.5;
  }

  .empty-text {
    color: #6b7280;
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
  }

  /* Orders Table */
  .orders-table-container {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid rgba(229, 231, 235, 0.5);
  }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .orders-table th {
    background: rgba(249, 250, 251, 0.8);
    color: #374151;
    font-weight: 600;
    padding: 1rem 0.75rem;
    text-align: left;
    border-bottom: 2px solid rgba(229, 231, 235, 0.5);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .order-row {
    transition: all 0.2s ease;
  }

  .order-row:hover {
    background: rgba(249, 250, 251, 0.5);
  }

  .orders-table td {
    padding: 1rem 0.75rem;
    border-bottom: 1px solid rgba(229, 231, 235, 0.3);
    color: #374151;
  }

  .price-cell {
    font-weight: 600;
    color: #059669;
  }

  .amount-cell {
    font-weight: 500;
  }

  .user-cell {
    color: #6b7280;
    font-size: 0.8rem;
  }

  .date-cell {
    color: #6b7280;
    font-size: 0.8rem;
  }

  .action-cell {
    text-align: center;
  }

  /* Action Buttons in Table */
  .action-button {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .action-button svg {
    width: 16px;
    height: 16px;
  }

  .cancel-button {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }

  .cancel-button:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.1);
  }

  .accept-button {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .accept-button:hover {
    background: rgba(16, 185, 129, 0.2);
    transform: scale(1.1);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Action Buttons Section */
  .action-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    justify-content: center;
  }

  .primary-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .primary-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
  }

  .secondary-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.9);
    color: #374151;
    border: 1px solid rgba(209, 213, 219, 0.5);
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .secondary-button:hover:not(:disabled) {
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .button-icon {
    width: 20px;
    height: 20px;
  }

  .primary-button:disabled,
  .secondary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Holdings Section */
  .holdings-section {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .holdings-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
  }

  .holdings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .holding-card {
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid rgba(229, 231, 235, 0.5);
  }

  .value-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: rgba(102, 126, 234, 0.3);
  }

  .yes-card {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border-color: rgba(16, 185, 129, 0.2);
  }

  .no-card {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border-color: rgba(239, 68, 68, 0.2);
  }

  .holding-label {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    opacity: 0.8;
  }

  .holding-value {
    font-size: 1.75rem;
    font-weight: 800;
  }

  /* Sell Section */
  .sell-section {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .sell-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .sell-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
  }

  .sell-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    min-width: 400px;
    max-width: 90vw;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: modalAppear 0.3s ease;
  }

  @keyframes modalAppear {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid rgba(229, 231, 235, 0.5);
    background: rgba(249, 250, 251, 0.5);
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .modal-close {
    width: 32px;
    height: 32px;
    border: none;
    background: rgba(107, 114, 128, 0.1);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: #6b7280;
  }

  .modal-close:hover {
    background: rgba(107, 114, 128, 0.2);
    color: #374151;
  }

  .modal-close svg {
    width: 16px;
    height: 16px;
  }

  .modal-form {
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid rgba(209, 213, 219, 0.5);
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: rgba(249, 250, 251, 0.5);
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .confirm-button {
    flex: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .confirm-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .cancel-button-modal {
    flex: 1;
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
    border: 2px solid rgba(209, 213, 219, 0.5);
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cancel-button:hover {
    background: rgba(107, 114, 128, 0.2);
    color: #374151;
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.875rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .form-error .error-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .orders-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .orders-container {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .page-title {
      font-size: 2rem;
    }

    .action-buttons {
      flex-direction: column;
      align-items: stretch;
    }

    .holdings-grid {
      grid-template-columns: 1fr;
    }

    .modal-content {
      min-width: auto;
      margin: 1rem;
    }

    .modal-header,
    .modal-form {
      padding: 1rem 1.5rem;
    }

    .modal-actions {
      flex-direction: column;
    }

    .orders-table-container {
      font-size: 0.8rem;
    }

    .orders-table th,
    .orders-table td {
      padding: 0.75rem 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .orders-table th,
    .orders-table td {
      padding: 0.5rem 0.375rem;
      font-size: 0.75rem;
    }

    .action-button {
      width: 28px;
      height: 28px;
    }

    .action-button svg {
      width: 14px;
      height: 14px;
    }
  }

  .chart-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }
</style>