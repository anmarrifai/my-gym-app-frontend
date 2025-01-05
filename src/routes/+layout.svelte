<script>
  import BottomNavigation from "$lib/components/BottomNav.svelte";
  import { page } from "$app/stores";
</script>

<slot />

{#if !["/login", "/signup", "/preference", "/"].includes($page.url.pathname)}
  <BottomNavigation />
{/if}
