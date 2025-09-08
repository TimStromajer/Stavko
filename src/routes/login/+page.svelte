<script>
  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase";
  import { signInWithEmailAndPassword } from "firebase/auth";

  let email = "";
  let password = "";
  let error = "";
  let success = "";

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

<h1>Prijava</h1>

<div class="p-4 max-w-sm mx-auto">
  <input type="email" bind:value={email} placeholder="Email" class="border p-2 w-full mb-2" />
  <input type="password" bind:value={password} placeholder="Password" class="border p-2 w-full mb-2" />
  <button on:click={login} class="bg-green-500 text-white px-4 py-2 rounded">Login</button>

  {#if error}
    <p class="text-red-500 mt-2">{error}</p>
  {/if}
  {#if success}
    <p class="text-green-500 mt-2">{success}</p>
  {/if}
</div>