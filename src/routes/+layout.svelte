<script>
  import BottomNavigation from "$lib/components/BottomNav.svelte";
  import { page } from "$app/stores";
  import "../app.css";
</script>

<slot />

{#if !["/login", "/signup", "/preference", "/"].includes($page.url.pathname)}
  <BottomNavigation />
{/if}

