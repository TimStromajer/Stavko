<script>
    import { goto } from "$app/navigation";
    import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let email = "";
  let name = "";
  let password = "";
  let error = null;
  let success = null;
  let loading = false;

  // Form validation states
  let emailValid = true;
  let nameValid = true;
  let passwordValid = true;
  let showPassword = false;

  async function register() {
    error = "";
    success = "";
    if (!email || !password) {
      error = "Email and password are required.";
      return;
    }
    try {
      const res = await fetch(PUBLIC_FUNCTIONS_URL + "users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });
      if (!res.ok) {
        const data = await res.json();
        error = data.error || "Registration failed.";
        return;
      }
      success = "Registration successful!";
      email = "";
      password = "";
      goto('/login');
    } catch (e) {
      error = e.message || "Registration failed.";
    }
  }

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateName = (name) => {
    return name.length >= 5;
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate all fields
    emailValid = validateEmail(email);
    nameValid = validateName(name);
    passwordValid = validatePassword(password);
    
    if (!emailValid || !nameValid || !passwordValid) {
      return;
    }

    // Call the register function
    await register();
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    showPassword = !showPassword;
  };

  // Get password strength
  const getPasswordStrength = (password) => {
    if (password.length === 0) return { level: 0, text: '' };
    if (password.length < 6) return { level: 1, text: 'Prešibko' };
    if (password.length < 8) return { level: 2, text: 'Šibko' };
    
    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score >= 3 && password.length >= 12) return { level: 5, text: 'Zelo močno' };
    if (score >= 3 && password.length >= 10) return { level: 4, text: 'Močno' };
    if (score >= 2) return { level: 3, text: 'Srednje' };
    return { level: 2, text: 'Šibko' };
  };

  // Reactive validation
  $: emailValid = email === '' || validateEmail(email);
  $: nameValid = name === '' || validateName(name);
  $: passwordValid = password === '' || validatePassword(password);
  $: formValid = email && name && password && emailValid && nameValid && passwordValid;
  $: passwordStrength = getPasswordStrength(password);
</script>

<main class="register-page">
  <div class="register-container">
    <div class="register-card">
      <!-- Header -->
      <div class="header">
        <h1 class="title">Registracija</h1>
        <p class="subtitle">Ustvarite svoj novi račun in se pridružite naši skupnosti.</p>
      </div>

      <!-- Registration Form -->
      <form on:submit={handleSubmit} class="register-form" novalidate>
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
              class:invalid={!emailValid}
              disabled={loading}
              autocomplete="email"
              required
            />
            <div class="input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            {#if email && emailValid}
              <div class="validation-icon valid" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
            {/if}
          </div>
          {#if !emailValid && email}
            <p class="field-error">Vnesite veljaven email naslov</p>
          {/if}
        </div>

        <!-- Username Field -->
        <div class="form-group">
          <label for="name" class="form-label">Uporabniško ime</label>
          <div class="input-wrapper">
            <input
              id="name"
              type="text"
              bind:value={name}
              placeholder="Vnesite uporabniško ime"
              class="form-input"
              class:invalid={!nameValid}
              disabled={loading}
              autocomplete="username"
              required
            />
            <div class="input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            {#if name && nameValid}
              <div class="validation-icon valid" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
            {/if}
          </div>
          {#if !nameValid && name}
            <p class="field-error">Uporabniško ime mora imeti najmanj 5 znakov</p>
          {:else if name && nameValid}
            <p class="field-success">Uporabniško ime je na voljo</p>
          {/if}
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password" class="form-label">Geslo</label>
          <div class="input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              placeholder="Vnesite varno geslo"
              class="form-input password-input"
              class:invalid={!passwordValid}
              disabled={loading}
              autocomplete="new-password"
              required
            />
            <div class="input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <button
              type="button"
              class="password-toggle"
              on:click={togglePasswordVisibility}
              disabled={loading}
              aria-label={showPassword ? 'Skrij geslo' : 'Prikaži geslo'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                {#if showPassword}
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                {:else}
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                {/if}
              </svg>
            </button>
          </div>
          
          {#if password}
            <!-- Password Strength Indicator -->
            <div class="password-strength">
              <div class="strength-bar">
                <div class="strength-fill level-{passwordStrength.level}"></div>
              </div>
              <span class="strength-text level-{passwordStrength.level}">{passwordStrength.text}</span>
            </div>
          {/if}
          
          {#if !passwordValid && password}
            <p class="field-error">Geslo mora imeti najmanj 6 znakov</p>
          {:else if password && passwordValid}
            <div class="password-requirements">
              <p class="requirements-title">Zahteve za geslo:</p>
              <ul class="requirements-list">
                <li class:met={password.length >= 6}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Najmanj 6 znakov
                </li>
                <li class:met={/[A-Z]/.test(password)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Velika črka (priporočeno)
                </li>
                <li class:met={/[0-9]/.test(password)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Številka (priporočeno)
                </li>
              </ul>
            </div>
          {/if}
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="register-button"
          disabled={!formValid || loading}
          aria-describedby={error ? 'error-message' : success ? 'success-message' : undefined}
        >
          {#if loading}
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
            </svg>
            Registriram...
          {:else}
            Registracija
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
          Že imate račun? 
          <a href="/login" class="footer-link">Prijavite se</a>
        </p>
      </div>
    </div>
  </div>
</main>

<style>
  .register-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  .register-container {
    width: 100%;
    max-width: 420px;
  }

  .register-card {
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

  .register-form {
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

  .validation-icon {
    position: absolute;
    right: 0.75rem;
  }

  .validation-icon.valid {
    color: #10b981;
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

  .password-strength {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .strength-bar {
    flex: 1;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }

  .strength-fill {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 2px;
  }

  .strength-fill.level-0 { width: 0%; }
  .strength-fill.level-1 { width: 20%; background: #ef4444; }
  .strength-fill.level-2 { width: 40%; background: #f59e0b; }
  .strength-fill.level-3 { width: 60%; background: #eab308; }
  .strength-fill.level-4 { width: 80%; background: #22c55e; }
  .strength-fill.level-5 { width: 100%; background: #16a34a; }

  .strength-text {
    font-size: 0.75rem;
    font-weight: 500;
    min-width: 80px;
  }

  .strength-text.level-1 { color: #ef4444; }
  .strength-text.level-2 { color: #f59e0b; }
  .strength-text.level-3 { color: #eab308; }
  .strength-text.level-4 { color: #22c55e; }
  .strength-text.level-5 { color: #16a34a; }

  .password-requirements {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.75rem;
    margin-top: 0.5rem;
  }

  .requirements-title {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    margin: 0 0 0.5rem 0;
  }

  .requirements-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .requirements-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #64748b;
    transition: color 0.2s ease;
  }

  .requirements-list li.met {
    color: #16a34a;
  }

  .requirements-list li svg {
    opacity: 0.3;
    transition: opacity 0.2s ease;
  }

  .requirements-list li.met svg {
    opacity: 1;
  }

  .field-error {
    color: #ef4444;
    font-size: 0.75rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .field-success {
    color: #16a34a;
    font-size: 0.75rem;
    margin: 0;
    font-weight: 500;
  }

  .register-button {
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

  .register-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .register-button:disabled {
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
    .register-page {
      padding: 0.5rem;
    }

    .register-card {
      padding: 1.5rem;
      border-radius: 12px;
    }

    .title {
      font-size: 1.75rem;
    }

    .register-form {
      gap: 1.25rem;
    }
  }
</style>