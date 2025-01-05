<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  const tabs = [
    { name: "Workout", route: "/workout", icon: "/workout.png" },
    { name: "Nutrition", route: "/nutrition", icon: "/plan.png" },
    { name: "Home", route: "/dashboard", icon: "/home.png" },
    { name: "Progress", route: "/progress", icon: "/progress.png" },
    { name: "Profile", route: "/profile", icon: "/profile.png" },
  ];

  let activeRoute = "";
  $: {
    $page && (activeRoute = $page.url.pathname);
  }

  function navigateTo(route: string) {
    goto(route);
  }
</script>

<div class="nav-bar">
  {#each tabs as { name, route, icon }}
    <div
      class="nav-tab {activeRoute === route ? 'active' : ''}"
      on:click={() => navigateTo(route)}
      aria-label="{name}"
    >
      <img src="{icon}" alt="{name} Icon" class="nav-icon" />
      <span class="nav-label">{name}</span>
    </div>
  {/each}
</div>

<style>
  .nav-bar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ffffff, #f8f9fa); /* Subtle gradient */
    padding: 10px 0;
    box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    border-top: 1px solid #444444;
  }

  .nav-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #cccccc; /* Default tab color */
    font-size: 1rem;
    cursor: pointer;
    transition: color 0.3s ease, transform 0.2s ease;
  }

  .nav-tab:hover {
    color: #4caf50; /* Hover effect (green accent) */
    transform: translateY(-2px); /* Slight lift on hover */
  }

  .nav-tab.active {
    color: #4caf50; /* Highlight active tab */
    font-weight: bold;
  }

  .nav-icon {
    width: 24px; /* Placeholder image width */
    height: 24px; /* Placeholder image height */
    margin-bottom: 4px;
    object-fit: contain; /* Ensure the PNG fits well */
    transition: transform 0.2s ease;
  }

  .nav-tab:hover .nav-icon {
    transform: scale(1.1); /* Slight zoom effect on hover */
  }

  .nav-label {
    font-size: 0.9rem; /* Text size for labels */
  }
</style>
