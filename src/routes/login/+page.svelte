<script>
  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase";
  import { signInWithEmailAndPassword } from "firebase/auth";

  let email = "";
  let password = "";
  let error = null;
  let success = null;
  let loading = false;

  async function login() {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      success = `Welcome back, ${userCredential.user.email}`;
      error = "";
      goto('/');
    } catch (err) {
      error = err.message;
      success = "";
    }
  }
</script>

<main class="login-page">
  <div class="login-container">
    <div class="login-card">
      <!-- Header -->
      <div class="header">
        <h1 class="title">Prijava</h1>
        <p class="subtitle">Dobrodošli nazaj! Prijavite se v svoj račun.</p>
      </div>

      <!-- Login Form -->
      <form on:submit={login} class="login-form" novalidate>
        <!-- Email Field -->
        <div class="form-group">
          <label for="email" class="form-label">Email naslov</label>
          <div class="input-wrapper">
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="ime@example.com"
              class="form-input"
              disabled={loading}
              autocomplete="email"
              required
            />
            <div class="input-icon email-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password" class="form-label">Geslo</label>
          <div class="input-wrapper">
            <input
              id="password"
              type="password"
              bind:value={password}
              placeholder="Vnesite svoje geslo"
              class="form-input password-input"
              disabled={loading}
              autocomplete="current-password"
              required
            />
            <div class="input-icon lock-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="login-button"
          disabled={loading}
          aria-describedby={error ? 'error-message' : success ? 'success-message' : undefined}
        >
          {#if loading}
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
            </svg>
            Prijavljam...
          {:else}
            Prijava
          {/if}
        </button>
      </form>

      <!-- Messages -->
      {#if error}
        <div class="message error-message" id="error-message" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>{error}</p>
        </div>
      {/if}

      {#if success}
        <div class="message success-message" id="success-message" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          <p>{success}</p>
        </div>
      {/if}

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">
          Še nimate računa? 
          <a href="/register" class="footer-link">Registrirajte se</a>
        </p>
      </div>
    </div>
  </div>
</main>

<style>
  .login-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  .login-container {
    width: 100%;
    max-width: 400px;
  }

  .login-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    padding: 2rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.5;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
    margin: 0;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: #fafafa;
    box-sizing: border-box;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-input.invalid {
    border-color: #ef4444;
  }

  .form-input.invalid:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .form-input:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }

  .input-icon {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    pointer-events: none;
  }

  .password-input {
    padding-right: 3rem;
  }

  .password-toggle {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .password-toggle:hover:not(:disabled) {
    color: #374151;
  }

  .password-toggle:disabled {
    cursor: not-allowed;
    color: #d1d5db;
  }

  .field-error {
    color: #ef4444;
    font-size: 0.75rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .login-button {
    width: 100%;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .login-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .login-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    font-size: 0.875rem;
  }

  .message p {
    margin: 0;
    flex: 1;
  }

  .error-message {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fca5a5;
  }

  .success-message {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #86efac;
  }

  .footer {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .footer-text {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }

  .footer-link {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .footer-link:hover {
    color: #4f46e5;
    text-decoration: underline;
  }

  /* Responsive Design */
  @media (max-width: 480px) {
    .login-page {
      padding: 0.5rem;
    }

    .login-card {
      padding: 1.5rem;
      border-radius: 12px;
    }

    .title {
      font-size: 1.75rem;
    }
  }
</style>