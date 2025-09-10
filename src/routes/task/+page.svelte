<script>
  import { onMount } from 'svelte';
  import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";
  import { auth } from "$lib/firebase";
  import { user } from "$lib/stores/user";

  let coordinates = [];
  let blocks = [];
  let uuid = null;

  onMount(() => {
    let unsubscribe = user.subscribe(async (u) => {
    });
    return () => unsubscribe();
  });

  async function generateBlocks() {
    await fetchCoordinates()
  }

  function removeBlock(id) {
    blocks = blocks.filter(block => block.id !== id);

    if (blocks.length === 0) {
      console.log("Congratulations");
      submitTask();
    }
  }

  async function fetchCoordinates() {
    try {
      const res = await fetch(PUBLIC_FUNCTIONS_URL + 'tasks');
      if (!res.ok) throw new Error('Failed to fetch users');
      let body = await res.json();
      coordinates = body.coordinates
      uuid = body.uuid;
      // Use coords to generate blocks at specific positions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const blockSize = 40; // must fit inside screen
      blocks = coordinates.map(coord => ({
        x: Math.floor(coord.x * (screenWidth - blockSize)),
        y: Math.floor(coord.y * (screenHeight - blockSize)),
        id: crypto.randomUUID()
      }));
    } catch (e) {
      
    } 
  }

  async function submitTask() {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch(PUBLIC_FUNCTIONS_URL + 'tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ uuid, coordinates })
        });
        if (!res.ok) throw new Error('Failed to create order');
      }
    } catch (e) {
      
    }
  }

</script>

<main>
  <button
    on:click={generateBlocks}
  >
    Generiraj bloke
  </button>

  {#each blocks as block (block.id)}
    <div
      class="block"
      style="width:40px; height:40px; left:{block.x}px; top:{block.y}px;"
      on:click={() => removeBlock(block.id)}
    ></div>
  {/each}
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    position: relative;
    background-color: #f3f4f6; /* light gray */
    overflow: hidden;
  }

  button {
    padding: 0.5rem 1rem;
    margin: 1rem;
    background-color: #2563eb; /* blue */
    color: white;
    border: none;
    border-radius: 0.375rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }

  .block {
    position: absolute;
    width: 40px;
    height: 40px;
    background-color: #ef4444; /* red */
    border-radius: 0.5rem;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .block:hover {
    transform: scale(1.1);
  }
</style>