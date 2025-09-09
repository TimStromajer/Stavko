<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/user';
  import { get } from 'svelte/store';
  import { auth } from "$lib/firebase";
  import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let users: any[] = [];
  let loading = true;
  let error = '';
  let selectedUserId: string | null = null;
  let selectedUserEmail: string | null = null;
  let selectedRoles: string[] = [];
  let newRole = '';
  let actionMessage = '';
  let isAdmin = false;
  let checkedAuth = false;

  async function fetchUsers() {
    loading = true;
    error = '';
    try {
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'users');
      if (!res.ok) throw new Error('Failed to fetch users');
      users = await res.json();
    } catch (e) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function openRoleModal(user: any) {
    selectedUserId = user.id;
    selectedUserEmail = user.email || user.name || user.id;
    selectedRoles = Array.isArray(user.roles) ? [...user.roles] : [];
    newRole = '';
    actionMessage = '';
  }

  function closeRoleModal() {
    selectedUserId = null;
    selectedUserEmail = null;
    selectedRoles = [];
    newRole = '';
    actionMessage = '';
  }

  async function addRole() {
    if (!selectedUserId || !newRole) return;
    actionMessage = '';
    try {
      let user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUserId, role: newRole, action: 'add' })
      });
      if (!res.ok) throw new Error('Failed to add role');
      actionMessage = 'Role added.';
      await fetchUsers();
      closeRoleModal();
    } catch (e) {
      actionMessage = e.message || 'Failed to add role';
    }
  }

  async function removeRole(role: string) {
    if (!selectedUserId) return;
    actionMessage = '';
    try {
      let user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUserId, role, action: 'remove' })
      });
      if (!res.ok) throw new Error('Failed to remove role');
      actionMessage = 'Role removed.';
      await fetchUsers();
      closeRoleModal();
    } catch (e) {
      actionMessage = e.message || 'Failed to remove role';
    }
  }

  // Watch for user changes and set checkedAuth to true if user is null
  onMount(() => {
      let unsubscribe = user.subscribe(async (u) => {
        if (u) {
          checkedAuth = false;
          isAdmin = false;
          const token = await u.getIdTokenResult();
          isAdmin = Array.isArray(token.claims.roles) && token.claims.roles.includes('admin');
          checkedAuth = true;
          fetchUsers();
        } else {
          checkedAuth = true;
          isAdmin = false;
        }
      });
      return () => unsubscribe();
  });
</script>


<h1>Admin: Manage User Roles</h1>

{#if !checkedAuth }
  <p>Checking permissions...</p>
{:else if !get(user)}
  <p style="color: red">You must be logged in to access this page.</p>
{:else if !isAdmin}
  <p style="color: red">You do not have permission to access this page.</p>
{:else if error}
  <p style="color: red">{error}</p>
{:else}
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th>User ID</th>
        <th>Email/Name</th>
        <th>Roles</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each users as user}
        <tr>
          <td>{user.id}</td>
          <td>{user.email || user.name || user.id}</td>
          <td>{Array.isArray(user.roles) ? user.roles.join(', ') : ''}</td>
          <td>
            <button on:click={() => openRoleModal(user)}>Manage Roles</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if selectedUserId}
  <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1000;">
    <div style="background: white; padding: 2rem; border-radius: 8px; min-width: 320px; box-shadow: 0 2px 16px #0002;">
      <h2>Manage Roles for {selectedUserEmail}</h2>
      <div style="margin-bottom: 1rem;">
        <strong>Current Roles:</strong>
        <ul>
          {#each selectedRoles as role}
            <li style="display: flex; align-items: center; gap: 0.5rem;">
              {role}
              <button on:click={() => removeRole(role)} style="color: #c00; background: none; border: none; cursor: pointer;">Remove</button>
            </li>
          {/each}
        </ul>
      </div>
      <div style="margin-bottom: 1rem;">
        <input type="text" placeholder="New role" bind:value={newRole} />
        <button on:click={addRole} disabled={!newRole}>Add Role</button>
      </div>
      {#if actionMessage}
        <p>{actionMessage}</p>
      {/if}
      <button on:click={closeRoleModal}>Close</button>
    </div>
  </div>
{/if}
