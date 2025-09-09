<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import type { FirestoreTimestamp } from '$lib/classes/FireStoreTimestamp';
  import type { Order } from '$lib/classes/Order';
  import { auth } from "$lib/firebase";
  import { user } from "$lib/stores/user";
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

  function toDate(val: FirestoreTimestamp): Date {
    if (typeof val === 'object' && 'seconds' in val) {
      return new Date(val.seconds * 1000 + Math.floor(val.nanoseconds / 1e6));
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
    let unsubscribe = user.subscribe(async (u) => {
      loading = true;
      error = '';
      if (u && u.uid) loginUserId = u.uid;
      await getOrders();
      await fetchHoldings();
      await getUserValue();
      loading = false;
    });
    return () => unsubscribe();
  });

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

<h1>Market Orders</h1>

{#if loading}
  <p>Loading orders...</p>
{:else if error}
  <p style="color: red">{error}</p>
{:else}
  <div style="display: flex; gap: 2rem;">
    <div style="flex: 1;">
      <h2>YES</h2>
      {#if yesOrders.length === 0}
        <p>No YES buy orders.</p>
      {:else}
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr><th>Price</th><th>Amount</th><th>User</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {#each yesOrders as order}
              <tr>
                <td>{order.price}</td>
                <td>{order.amount}</td>
                <td>{order.userId}</td>
                <td>{toDate(order.placedDate).toLocaleString()}</td>
                <td>
                  {#if order.userId === loginUserId}
                    <button on:click={() => cancelOrder(order.id)} title="Cancel Order" style="background: none; border: none; cursor: pointer; color: #c00; font-size: 1.2em;">✖️</button>
                  {:else}
                    <button on:click={() => acceptOrder(order.id)} title="Accept Order" style="background: none; border: none; cursor: pointer; color: #090; font-size: 1.2em;">✔️</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
    <div style="flex: 1;">
      <h2>NO</h2>
      {#if noOrders.length === 0}
        <p>No NO buy orders.</p>
      {:else}
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr><th>Price</th><th>Amount</th><th>User</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {#each noOrders as order}
              <tr>
                <td>{order.price}</td>
                <td>{order.amount}</td>
                <td>{order.userId}</td>
                <td>{toDate(order.placedDate).toLocaleString()}</td>
                <td>
                  {#if order.userId === loginUserId}
                    <button disabled={!loginUserId} on:click={() => cancelOrder(order.id)} title="Cancel Order" style="background: none; border: none; cursor: pointer; color: #c00; font-size: 1.2em;">✖️</button>
                  {:else}
                    <button disabled={!loginUserId} on:click={() => acceptOrder(order.id)} title="Accept Order" style="background: none; border: none; cursor: pointer; color: #090; font-size: 1.2em;">✔️</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>

{#if loginUserId}
  <div style="margin-top: 2rem; display: flex; gap: 1rem; align-items: center;">
    <button on:click={openOrderModal} disabled={marketStatus === 'CLOSED'}>Create order</button>
    <button on:click={() => goto(`/markets/${get(page).params.id}/confirm`)} disabled={marketStatus === 'CLOSED'}>Confirm market</button>
  </div>

  <div style="margin-top: 2rem;">
    <h3>Your Holdings</h3>
    <div style="display: flex; gap: 2rem; align-items: center;">
      <div>User Value: {userValue}</div>
      <div>YES: {holdingsYes}</div>
      <div>NO: {holdingsNo}</div>
    </div>
  </div>

  <div style="margin-top: 2rem;">
    <button on:click={openSellModal} disabled={marketStatus === 'CLOSED'}>Sell Holdings</button>
  </div>
  {/if}

  {#if showModal}
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; padding: 2rem; border-radius: 8px; min-width: 320px; box-shadow: 0 2px 16px #0002;">
        <h2>Create Order</h2>
        <form on:submit|preventDefault={submitOrder}>
          <div style="margin-bottom: 1rem;">
            <label>Type:
              <select bind:value={modalType} required>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </label>
          </div>
          <div style="margin-bottom: 1rem;">
            <label>Price (0-1): <input type="number" min="0" max="1" step="0.01" bind:value={modalPrice} required /></label>
          </div>
          <div style="margin-bottom: 1rem;">
            <label>Amount: <input type="number" min="1" step="1" bind:value={modalAmount} required /></label>
          </div>
          <div style="display: flex; gap: 1rem;">
            <button type="submit">Confirm</button>
            <button type="button" on:click={closeModal}>Cancel</button>
          </div>
          {#if modalError}
            <p style="color: red; margin-top: 1rem;">{modalError}</p>
          {/if}
        </form>
      </div>
    </div>
  {/if}

  {#if showSellModal}
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; padding: 2rem; border-radius: 8px; min-width: 320px; box-shadow: 0 2px 16px #0002;">
        <h2>Sell Holdings</h2>
        <form on:submit|preventDefault={submitSellOrder}>
          <div style="margin-bottom: 1rem;">
            <label>Type:
              <select bind:value={sellType} required>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </label>
          </div>
          <div style="margin-bottom: 1rem;">
            <label>Price (0-1): <input type="number" min="0" max="1" step="0.01" bind:value={sellPrice} required /></label>
          </div>
          <div style="margin-bottom: 1rem;">
            <label>Amount: <input type="number" min="1" step="1" bind:value={sellAmount} required /></label>
          </div>
          <div style="display: flex; gap: 1rem;">
            <button type="submit">Confirm</button>
            <button type="button" on:click={closeSellModal}>Cancel</button>
          </div>
          {#if sellError}
            <p style="color: red; margin-top: 1rem;">{sellError}</p>
          {/if}
        </form>
      </div>
    </div>
  {/if}
{/if}