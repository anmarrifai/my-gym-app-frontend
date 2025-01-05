<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/firebaseConfig";

  export let currentStreak: number = 0;
  export let badge: string = "";
  export let streakLabel: string = "days";


  // get all the dates where the user has a log in the daily summary table 
  async function fetchStreakData() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error("User not logged in!");

      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/streak?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch streak data");

      // get hte log dates from the api rsponse 
      const data: { log_date: string }[] = await response.json();

      // Calculate streak
      currentStreak = calculateStreak(data.map((entry) => entry.log_date));

      // changee the badge if needed 
      badge = currentStreak >= 30 ? "/month.png" :
              currentStreak >= 7 ? "/week.png" : "";

      // drop the "s" if the streak is 1
      streakLabel = currentStreak === 1 ? "day" : "days";
    } catch (error) {
      console.error("Error fetching streak data:", error);
    }
  }

  function calculateStreak(dates: string[]): number {
    if (!dates.length) return 0;

    // take the dates and sort them from most recent 
    const sortedDates = dates
      .map((date) => new Date(date))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1; 
    // check if the dates are consecutive and increement if it is 
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.ceil((sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        streak++; 
      } else if (diff > 1) {
        break; // Streak broken
      }
    }
    return streak;
  }

  onMount(() => {
    fetchStreakData();
  });
</script>

<div class="streak-counter" aria-label="Your current streak is {currentStreak} {streakLabel}">
  <div class="streak-info">
    <h3 class="streak-title">
      🔥 Current Streak: <span class="streak-days">{currentStreak}</span> {streakLabel}
    </h3>
    {#if badge}
      <img
        src={badge}
        alt="Streak Badge for {currentStreak} days"
        class="streak-badge {currentStreak >= 7 && currentStreak < 30 ? 'milestone' : ''} {currentStreak >= 30 ? 'major-milestone' : ''}"
      />
    {/if}
  </div>
</div>

<style>
  .streak-counter {
    text-align: center;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    padding: 20px;
    border-radius: 10px;
    margin: 20px 0;
    color: #333333;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .streak-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px; 
  }

  .streak-title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .streak-days {
    color: #4caf50;
  }

  .streak-badge {
    width: 50px;
    height: 50px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .streak-badge:hover {
    transform: scale(1.1);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
  }

  .milestone {
    animation: pulse 1.5s infinite;
  }

  .major-milestone {
    animation: shine 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 5px rgba(76, 175, 80, 0.4);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 15px rgba(76, 175, 80, 0.7);
    }
  }

  @keyframes shine {
    0% {
      transform: scale(1);
      box-shadow: 0 0 10px rgba(255, 223, 0, 0.5);
    }
    50% {
      transform: scale(1.2);
      box-shadow: 0 0 20px rgba(255, 223, 0, 0.8);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 10px rgba(255, 223, 0, 0.5);
    }
  }
</style>
