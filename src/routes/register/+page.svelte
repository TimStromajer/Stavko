<script>
    import { goto } from "$app/navigation";
    import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

  let email = "";
  let name = "";
  let password = "";
  let error = "";
  let success = "";

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
</script>

<h1>Registracija</h1>

<div class="p-4 max-w-sm mx-auto">
  <input type="email" bind:value={email} placeholder="Email" class="border p-2 w-full mb-2" />
  <input type="name" bind:value={name} placeholder="Usename" class="border p-2 w-full mb-2" />
  <input type="password" bind:value={password} placeholder="Password" class="border p-2 w-full mb-2" />
  <button on:click={register} class="bg-blue-500 text-white px-4 py-2 rounded">Register</button>

  {#if error}
    <p class="text-red-500 mt-2">{error}</p>
  {/if}
  {#if success}
    <p class="text-green-500 mt-2">{success}</p>
  {/if}
</div>