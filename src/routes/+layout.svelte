<script lang="ts">
  import { user } from "$lib/stores/user";
  import { auth } from "$lib/firebase";
  import { signOut } from "firebase/auth";

  let { children } = $props();

  function logout() {
    signOut(auth);
  }
</script>

<header>
  <h1>STAVKO</h1>
  <nav>
      <a href="/">Domov</a>
      <a href="/leaderboard">Lestvica</a>
      {#if $user === null}
        <a href="/login">Prijava</a>
        <a href="/register">Registracija</a>
      {/if}
      {#if $user}
        <a href="#" on:click|preventDefault={logout}>Odjava</a>
        <span>{$user.displayName}</span>
      {/if}

  </nav>
</header>

<main>
  {@render children()}
</main>

<style>
  header {
    padding: 0.2rem 1rem 0.2rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ccc;
  }

  nav {
    display: flex;
    gap: 1rem;
  }
</style>