<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/firebaseConfig";
  import { goto } from '$app/navigation';
  import { dailyWorkoutStore } from "$lib/store";
  import { get } from "svelte/store";
  import SummarySection from "$lib/components/SummarySection.svelte";
  import StreakCounter from "$lib/components/StreakCounter.svelte";
  import type { LoggedFood } from "$lib/types/loggedFood";
  import { Preferences } from "@capacitor/preferences";

  
  let userName: string | null = "";
  let selectedDate: string = new Date().toISOString().split("T")[0];
  let dailyLog: LoggedFood[] = [];


  const dailyWorkout = get(dailyWorkoutStore);
  // get the dail logss to pass them to the sumaary section component
  async function fetchLogs() {
    const { value } = await Preferences.get({ key: selectedDate });
    dailyLog = value ? JSON.parse(value) : [];
    dailyLog = [...dailyLog];
  }

  onMount(async () => {
    const user = auth.currentUser;
    if (user) {
      userName = user.displayName || "Champion";
    }
    fetchLogs();
  });
</script>

<div class="dashboard">
  <!-- Greeting Section -->
  <section class="greeting-section">
    <h1>Welcome Back, {userName}!</h1>
    <p>Ready to conquer the day?</p>
  </section>

  <!-- Streak Counter Section -->
  <div class="dashboard-streak">
    <StreakCounter />
  </div>

  <!-- Nutrition Summary Section -->
  <section class="nutrition-summary-section" on:click={() => goto('/nutrition')}>
    <SummarySection {dailyLog} />
  </section>

  <!-- Workout Section -->
  <section class="workout-section" on:click={() => goto('/workout')}>
    <h2>Today's Workout</h2>
    {#if dailyWorkout.length > 0}
      <ul>
        {#each dailyWorkout as exercise}
          <li>{exercise.exercise_name}</li>
        {/each}
      </ul>
    {:else}
      <p>No workout planned for today. Stay active!</p>
    {/if}
  </section>

  <!-- Progress Page Section -->
  <section class="progress-section" on:click={() => goto('/progress')}>
    <div class="progress-card">
      <h2>Track Your Progress</h2>
      <p>Log and track your progress to hit your goals!</p>
    </div>
  </section>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 20px;
    padding-bottom: 80px; /* Extra padding to avoid bottom nav overlap */
    background: linear-gradient(135deg, #ffffff, #f8f9fa);
    border-radius: 16px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    margin: 0 auto;
  }

  .greeting-section {
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, #4caf50, #66bb6a);
    border-radius: 16px;
    color: #ffffff;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }

  .greeting-section h1 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }

  .greeting-section p {
    font-size: 1.2rem;
  }

 

  .workout-section,
  .progress-section {
    background: #ffffff;
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
  }

  .workout-section:hover,
  .progress-section:hover {
    transform: translateY(-4px);
    box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.2);
  }

  .workout-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .workout-section li {
    background: #f1f1f1;
    padding: 10px;
    margin-bottom: 0.5rem;
    border-radius: 8px;
  }

  .progress-card {
    text-align: center;
  }
</style>