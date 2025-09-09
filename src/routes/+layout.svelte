<script lang="ts">
  import { user } from "$lib/stores/user";
  import { auth } from "$lib/firebase";
  import { signOut } from "firebase/auth";

  let { children } = $props();

  function logout() {
    signOut(auth);
  }
</script>

<header class="modern-header">
  <div class="header-content">
    <div class="logo-section">
      <h1 class="logo">STAVKO</h1>
    </div>
    <nav class="navigation">
      <a href="/" class="nav-link">Domov</a>
      <a href="/leaderboard" class="nav-link">Lestvica</a>
      {#if $user === null}
        <a href="/login" class="nav-link auth-link">Prijava</a>
        <a href="/register" class="nav-link auth-button">Registracija</a>
      {/if}
      {#if $user}
        <div class="user-section">
          <span class="user-name">{$user.displayName}</span>
          <a href="#" on:click|preventDefault={logout} class="logout-button">Odjava</a>
        </div>
      {/if}
    </nav>
  </div>
</header>

<main>
  {@render children()}
</main>

<style>
  /* Modern Header Styles */
  .modern-header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 1px 20px rgba(0, 0, 0, 0.05);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo-section {
    display: flex;
    align-items: center;
  }

  .logo {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.025em;
  }

  .navigation {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    color: #374151;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    position: relative;
    font-size: 0.95rem;
  }

  .nav-link:hover {
    color: #667eea;
    background: rgba(102, 126, 234, 0.08);
    transform: translateY(-1px);
  }

  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transition: all 0.3s ease;
    transform: translateX(-50%);
  }

  .nav-link:hover::after {
    width: 100%;
  }

  .auth-link {
    color: #6b7280;
  }

  .auth-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    padding: 0.625rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .auth-button:hover {
    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .auth-button::after {
    display: none;
  }

  .user-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(102, 126, 234, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(102, 126, 234, 0.1);
  }

  .user-name {
    color: #374151;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .logout-button {
    color: #ef4444 !important;
    text-decoration: none;
    font-weight: 500;
    padding: 0.375rem 0.75rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    font-size: 0.875rem;
    border: 1px solid rgba(239, 68, 68, 0.2);
    background: rgba(239, 68, 68, 0.05);
  }

  .logout-button:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    transform: translateY(-1px);
  }

  .logout-button::after {
    display: none;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .header-content {
      padding: 1rem;
      flex-direction: column;
      gap: 1rem;
    }

    .navigation {
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .user-section {
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .logo {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .navigation {
      gap: 0.5rem;
    }

    .nav-link {
      padding: 0.375rem 0.5rem;
      font-size: 0.875rem;
    }

    .auth-button {
      padding: 0.5rem 1rem;
    }
  }
</style>