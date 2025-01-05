<script lang="ts">
  import {
    Chart,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    Filler,
    Tooltip,
    Legend,
  } from "chart.js";
  import { onMount, tick } from "svelte";
  import { auth } from "$lib/firebaseConfig"; // To get user_id
  import SummarySection from "../../lib/components/SummarySection.svelte";
  import type { LoggedFood } from "$lib/types/loggedFood";
  import { Preferences } from "@capacitor/preferences";
  import StreakCounter from "$lib/components/StreakCounter.svelte";
  // Register Chart.js components
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    Filler,
    Tooltip,
    Legend
  );

  // Types
  interface WeightEntry {
    log_date: string; // Format: YYYY-MM-DD
    weight: number;
  }

  interface FatPercentageEntry {
    log_date: string; // Format: YYYY-MM-DD
    fat_percentage: number;
  }
  type LoggedExercise = {
    exercise_id: string;
    exercise_name: string;
  };

  type MuscleGroup = {
    group_name: string;
    exercises: LoggedExercise[];
    expanded: boolean;
  };

  let muscleGroups: MuscleGroup[] = [
    { group_name: "Chest", exercises: [] ,expanded: false},
    { group_name: "Back", exercises: [] ,expanded: false},
    { group_name: "Legs", exercises: [] ,expanded: false },
    { group_name: "Shoulders", exercises: [] ,expanded: false },
    { group_name: "Biceps", exercises: [] ,expanded: false},
    { group_name: "Triceps", exercises: [] ,expanded: false },
    { group_name: "Core", exercises: [],expanded: false },
    { group_name: "Cardio", exercises: [] ,expanded: false },
  ];
  // State for active tab
  let activeTab: "weight" | "fatPercentage" = "weight";

  // Chart references
  let weightChartRef: Chart | null = null;
  let fatPercentageChartRef: Chart | null = null;

  // State for user data
  let weightData: WeightEntry[] = [];
  let fatPercentageData: FatPercentageEntry[] = [];

  
  let currentStreak = 0;
  let badge = ""; // Badge text or image URL

  let selectedDate: string = new Date().toISOString().split("T")[0]; // Default to today
  let availableDates: string[] = [new Date().toISOString().split("T")[0]]; // Initialize with today's date

  let dailyLog: LoggedFood[] = [];

  let showModal = false; // Toggle for modal visibility
  let newWeight: number | null = null;
  let newFatPercentage: number | null = null;
  let logDate: string = new Date().toISOString().split("T")[0];
  let isLoading = true; // To show spinner during fetch
  let errorMessage = ""; // To display errors if any
  let selectedExercise: { name: string; id: string } | null = null;
  let exerciseLogs: Record<string, { set_number: number; reps: number; weight: number }[]> | null = null;



  // Fetch user data
  async function fetchUserData(): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("User ID is not available!");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/weight-logs?user_id=${userId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch weight logs");
      }

      const data: { log_date: string; weight: string; fat_percentage?: string }[] =
        await response.json();

      // Parse the data for the charts
      weightData = data.map((entry) => ({
        log_date: entry.log_date.split("T")[0],
        weight: parseFloat(entry.weight),
      }));

      fatPercentageData = data
        .filter((entry) => entry.fat_percentage !== undefined)
        .map((entry) => ({
          log_date: entry.log_date.split("T")[0],
          fat_percentage: parseFloat(entry.fat_percentage!),
        }));
      // Render the active chart
      createChart();
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }
  async function fetchLogs() {
    const { value } = await Preferences.get({ key: selectedDate });
    dailyLog = value ? JSON.parse(value) : [];
    dailyLog = [...dailyLog]; // Trigger reactivity

    // Ensure all dates from storage are added to availableDates
    const allKeys = (await Preferences.keys()).keys;
    const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)); // Match date format YYYY-MM-DD
    availableDates = Array.from(new Set([...availableDates, ...dateKeys])); // Deduplicate dates
    
  }

  

  // Fetch Exercise Logs by Exercise ID
  async function fetchExerciseLogs(exerciseId: string) {
    isLoading = true;
    errorMessage = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/exercise-log/${auth.currentUser?.uid}/${exerciseId.trim()}`
      );
      if (!response.ok) {
        console.error("Failed to fetch exercise logs:", await response.text());
        throw new Error("Failed to fetch exercise logs.");
      }

      exerciseLogs = await response.json();
     
    } catch (error) {
      console.error(error);
      errorMessage = "Could not fetch exercise logs. Please try again.";
    } finally {
      isLoading = false;
    }
  }


  async function logWeight() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert("User not logged in!");
      return;
    }

    if (!newWeight || isNaN(newWeight)) {
      alert("Please enter a valid weight!");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/weight-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          log_date: logDate,
          weight: newWeight,
          fat_percentage: newFatPercentage || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log weight");
      }

      alert("Weight logged successfully!");
      newWeight = null;
      newFatPercentage = null;
      showModal = false;
      fetchUserData(); // Refresh data
    } catch (error) {
      console.error("Error logging weight:", error);
      alert("Failed to log weight. Please try again.");
    }
  }
  

  async function fetchLoggedExercises() {
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/logged-exercises/${auth.currentUser?.uid}`
      );
      if (!response.ok) {
        console.error("Failed to fetch logged exercises:", await response.text());
        throw new Error("Failed to fetch logged exercises.");
      }
      const data: LoggedExercise[] = await response.json();
      

      categorizeExercises(data);
    } catch (error) {
      console.error(error);
      errorMessage = "Could not fetch logged exercises. Please try again.";
    } finally {
      isLoading = false;
    }
  }
  // Render Weight Chart
  async function renderWeightChart(): Promise<void> {
    const canvas = document.getElementById("weightChart") as HTMLCanvasElement | null;

    if (!canvas) {
      console.error("Weight chart canvas not found!");
      return;
    }

    if (weightChartRef) {
      
      weightChartRef.destroy();
    }

    weightChartRef = new Chart(canvas, {
      type: "line",
      data: {
        labels: weightData.map((entry) => entry.log_date),
        datasets: [
          {
            label: "Weight (kg)",
            data: weightData.map((entry) => entry.weight),
            borderColor: "#4caf50",
            backgroundColor: "rgba(76, 175, 80, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
            position: "top",
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            title: {
              display: true,
              text: "Weight (kg)",
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Render Fat Percentage Chart
  async function renderFatPercentageChart(): Promise<void> {
    const canvas = document.getElementById(
      "fatPercentageChart"
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      console.error("Fat percentage chart canvas not found!");
      return;
    }

    if (fatPercentageChartRef) {
      fatPercentageChartRef.destroy();
    }

    fatPercentageChartRef = new Chart(canvas, {
      type: "line",
      data: {
        labels: fatPercentageData.map((entry) => entry.log_date),
        datasets: [
          {
            label: "Fat Percentage (%)",
            data: fatPercentageData.map((entry) => entry.fat_percentage),
            borderColor: "#ff9800",
            backgroundColor: "rgba(255, 152, 0, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
            position: "top",
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            title: {
              display: true,
              text: "Fat Percentage (%)",
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Handle Tab Switch
  async function createChart(): Promise<void> {
    await tick(); // Ensure DOM updates are complete

    if (activeTab === "weight") {
      renderWeightChart();
    } else if (activeTab === "fatPercentage") {
      renderFatPercentageChart();
    }
  }

  

  // Function to categorize exercises into muscle groups
  function categorizeExercises(exercises: LoggedExercise[]) {
   
    muscleGroups.forEach((group) => (group.exercises = [])); // Reset groups

    exercises.forEach((exercise) => {
      // Trim the exercise_id to remove trailing spaces
      const trimmedId = exercise.exercise_id.trim();
      // Extract the group index using regex
      const groupIndex =  parseInt(trimmedId[15]);
      if(!isNaN(groupIndex) && groupIndex >=1 && groupIndex <=8){
        muscleGroups[groupIndex - 1].exercises.push(exercise);
      }
       else {
        console.warn("Invalid group index for exercise:", exercise);
      }
    });
  }

    // Handle Exercise Card Click
  function selectExercise(exercise: { exercise_name: string; exercise_id: string }) {
    selectedExercise = { name: exercise.exercise_name, id: exercise.exercise_id };
    fetchExerciseLogs(exercise.exercise_id);
  }

  // Back to Muscle Groups
  function backToMuscleGroups() {
    selectedExercise = null;
    exerciseLogs = null;
  }
  onMount(() => {
    fetchUserData();
    fetchLogs();
    fetchLoggedExercises();
    
  });
</script>



<div class="progress-container">
  <!-- Streak Counter Section -->
  <div class="streak-section">
    <StreakCounter />
  </div>

  <!-- Summary Section -->
  <div class="summary-section-wrapper">
    <SummarySection {dailyLog} />
  </div>

  <!-- Charts Section -->
  <div class="charts-section"> 
    <div class="tabs">
      <button
        class="tab-button {activeTab === 'weight' ? 'active-tab' : ''}"
        on:click={() => {
          activeTab = "weight";
          createChart();
        }}
      >
        Weight
      </button>
      <button
        class="tab-button {activeTab === 'fatPercentage' ? 'active-tab' : ''}"
        on:click={() => {
          activeTab = "fatPercentage";
          createChart();
        }}
      >
        Fat Percentage
      </button>
    </div>
    {#if activeTab === "weight"}
      <div class="chart-container">
        <canvas id="weightChart"></canvas>
      </div>
    {:else if activeTab === "fatPercentage"}
      <div class="chart-container">
        <canvas id="fatPercentageChart"></canvas>
      </div>
    {/if}
  </div>
  <button class="log-weight-button" on:click={() => (showModal = true)}>
    Log Weight
  </button>
  <!-- Log Weight Modal -->
  {#if showModal}
    <div class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Log Your Weight</h3>
        <label class="modal-label" for="logDate">Date:</label>
        <input
          type="date"
          id="logDate"
          class="modal-input"
          bind:value={logDate}
        />

        <label class="modal-label" for="weight">Weight (kg):</label>
        <input
          type="number"
          id="weight"
          class="modal-input"
          bind:value={newWeight}
          placeholder="Enter your weight"
        />

        <label class="modal-label" for="fatPercentage">Fat Percentage (%):</label>
        <input
          type="number"
          id="fatPercentage"
          class="modal-input"
          bind:value={newFatPercentage}
          placeholder="Optional"
        />

        <button class="modal-action-button" on:click={logWeight}>
          Log Weight
        </button>
        <button
          class="close-modal-button"
          on:click={() => (showModal = false)}
        >
          Close
        </button>
      </div>
    </div>
  {/if}

  <!-- Exercise Section -->
  <div class="exercise-section">
    <h3>Check your previous lifts:</h3>
    {#if isLoading}
      <div class="spinner"></div>
    {:else}
      {#if selectedExercise}
        <div class="exercise-logs">
          <div class="breadcrumb">
            <span
              class="breadcrumb-link"
              on:click={backToMuscleGroups}
            >
              Muscle Groups
            </span>
            <span class="breadcrumb-separator"> &gt; </span>
            <span class="breadcrumb-active">
              {selectedExercise?.name || "Exercise Logs"}
            </span>
          </div>

          <h3 class="exercise-title">{selectedExercise.name}</h3>

          {#if isLoading}
            <div class="spinner"></div>
          {:else if exerciseLogs && Object.keys(exerciseLogs).length > 0}
            {#each Object.entries(exerciseLogs) as [date, sets]}
              <div class="session-card">
                <h4 class="session-date">📅 {new Date(date).toLocaleDateString()}</h4>
                <p class="session-total-sets">Total Sets: {sets.length}</p>

                {#each sets as set}
                  <div class="log-entry">
                    <span class="log-icon">🏋️</span>
                    <span class="log-text">Set {set.set_number} - {set.reps} reps @ {set.weight || 'N/A'} kg</span>
                  </div>
                {/each}
              </div>
            {/each}
          {:else}
            <p class="no-logs-message">No logs found for this exercise.</p>
          {/if}
        </div>
      {:else}
        <div class="muscle-groups">
          {#each muscleGroups as group}
            <div class="muscle-group-card">
              <div
                class="group-header"
                on:click={() => (group.expanded = !group.expanded)}
              >
                <span class="group-icon">🏋️</span>
                <h3 class="group-title">{group.group_name}</h3>
                <span class="toggle-icon">{group.expanded ? "▲" : "▼"}</span>
              </div>

              {#if group.expanded}
                {#if group.exercises.length > 0}
                  <div class="exercise-list">
                    {#each group.exercises as exercise}
                      <div
                        class="exercise-card"
                        on:click={() => selectExercise(exercise)}
                      >
                        {exercise.exercise_name}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="placeholder-text">
                    You don’t have logs for this muscle group. Maybe focus on it more!
                  </p>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>


<style>
/* Global Styling for the Progress Page */

/* Container for the entire progress page */
.progress-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  position: relative;
  margin-bottom: 70px;
}

/* Streak Section */
.streak-section {
  text-align: center;
  padding: 3px;
  border-radius: 10px;
  margin-bottom: 20px;
  width: 100%;
}

/* Summary Section Wrapper */
.summary-section-wrapper {
  width: 99%;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.1) inset;
  text-align: center;
}

/* Tabs and Button */

.tabs {
  display: flex;
  justify-content: space-between;
  margin: 0 auto 20px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 10px;
  max-width: 600px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}

.tab-button {
  flex: 1;
  text-align: center;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  background-color: #f9f9f9;
  color: #333333;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.tab-button:hover {
  background-color: #e0e0e0;
}

.active-tab {
  background-color: #007bff;
  color: white;
  box-shadow: 0px 4px 6px rgba(0, 123, 255, 0.4);
}

/* Log Weight Button as Wide Button */
.log-weight-button {
  background-color: #007bff; /* Green */
  color: white;
  width: 70%;
  max-width: 600px;
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  margin-top: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.log-weight-button:hover {
  background-color: #45a049;
}

/* Chart Container */
.chart-container {
  width: 100%;
  max-width: 700px;
  height: 400px;
  margin: 0 auto;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Modal Styling */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.2);
}

.modal-title {
  font-size: 20px;
  margin-bottom: 15px;
  color: #333333;
}

.modal-label {
  display: block;
  text-align: left;
  margin-bottom: 5px;
  font-weight: bold;
  color: #444444;
}

.modal-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #cccccc;
  border-radius: 5px;
  font-size: 14px;
}

.modal-action-button {
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.modal-action-button:hover {
  background-color: #45a049;
}

.close-modal-button {
  background-color: #f44336; /* Red */
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  margin-top: 10px;
}

.close-modal-button:hover {
  background-color: #d32f2f;
}

/* Muscle Groups Section */
.exercise-section {
  width: 100%;
  margin-top: 20px;
}
.muscle-group-card {
  background-color: #ffffff;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #ddd;
  margin-bottom: 15px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f9;
  padding: 10px 15px;
  cursor: pointer;
  border-radius: 10px;
  transition: background-color 0.3s ease;
}

.group-header:hover {
  background-color: #e0e0e0;
}

.group-title {
  font-size: 16px;
  font-weight: bold;
  color: #333333;
}
.toggle-icon {
  font-size: 16px;
  font-weight: bold;
}

.exercise-list {
  padding: 10px 15px;
  background: #f9f9f9;
}

.exercise-card {
  background-color: #ffffff;
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}
.exercise-card:hover {
  background-color: #007bff;
  color: #ffffff;
  transform: translateY(-2px);
}
.placeholder-text {
  color: #666666;
  font-style: italic;
  margin: 10px 0;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
}

.breadcrumb-link:hover {
  color: #0056b3;
}

.breadcrumb-separator {
  margin: 0 5px;
  color: #999999;
}

.breadcrumb-active {
  font-weight: bold;
  color: #333333;
}

/* Exercise Logs */
.exercise-logs {
  margin-top: 20px;
}

.session-card {
  background-color: #ffffff; /* White background */
  color: #333333; /* Darker text for readability */
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  transition: transform 0.3s ease;
}
.session-card:hover {
  transform: scale(1.02); /* Slight hover effect */
}

.session-date {
  font-size: 16px;
  font-weight: bold;
  color: #007bff; /* Blue for dates */
  margin-bottom: 5px;
}

.session-total-sets {
  color: #666666;
  font-size: 14px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 10px;
  box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
}

.log-icon {
  margin-right: 10px;
  font-size: 18px;
  color: #4caf50;
}

.log-text {
  font-size: 14px;
  color: #333333;
}

/* Spinner */
.spinner {
  margin: 20px auto;
  border: 4px solid #ccc;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Body Margin for Bottom Navigation */

</style>