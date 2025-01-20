<script lang="ts">
  import { onMount } from "svelte"; 
  import { auth } from "$lib/firebaseConfig"; 
  import { dailyWorkoutStore } from "$lib/store";


   // Types
   type WeeklyPlanDay = {
    day_name: string;
    day_number: number;
    is_rest: boolean;
    num_exercises: number;
  };

  type LoggedSet = {
    reps: string;
    weight: string;
    error?: string | null;
  };

  type ExerciseLog = {
    set_number: number;
    reps: string;
    weight: string;
  };

  type PreviousLogs = Record<string, ExerciseLog[]>;

  type DailyWorkoutExercise = {
    exercise_id: string;
    exercise_name: string;
    description: string;
    exercise_rank: number;
    loggedData: LoggedSet[];
    previousLogs: PreviousLogs | null;
    showLogs?: boolean;
    completed: boolean;
    editMode: boolean;
  };

  // State Variables
  let userId: string | null = null;
  let currentDay: number | null = null;
  let splitId: string | null = null;
  let weeklyPlan: WeeklyPlanDay[] = [];
  let dailyWorkout: DailyWorkoutExercise[] = [];
  let activeTab: "daily" | "weekly" = "daily";

  const MAX_SETS = 10;
  let expandedExercises: Record<string, boolean> = {};
  let toastMessage: string | null = null;
  let toastType: "success" | "error" | null = null;

  
  onMount(() => {
    const user = auth.currentUser;
    if (user) {
      userId = user.uid;
      fetchPreferencesAndData();
      scheduleMidnightUpdate();
    } else {
      showToast("User is not logged in.", "error");
    }
  });

    

    //fetch prefernces to get the users workout plan 
    async function fetchPreferencesAndData() {
    if (!userId) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/preferences/${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        const { start_date, split_id } = data;
        splitId = split_id;
        currentDay = calculateCurrentDay(start_date);

        if (splitId && currentDay) {
          fetchWeeklyPlan(splitId, currentDay);
          fetchDailyWorkout(userId, currentDay);
        }
      } else {
        showToast("Failed to fetch preferences.", "error");
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      showToast("An error occurred while fetching preferences.", "error");
    }
  }

  // fetch the weekly plan
  async function fetchWeeklyPlan(splitId: string, dayNumber: number) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/weekly-plan/${splitId.trim()}/${dayNumber}`
      );
      if (response.ok) {
        weeklyPlan = await response.json();
      } else {
        console.error("Failed to fetch weekly plan.");
      }
    } catch (error) {
      console.error("Error fetching weekly plan:", error);
    }
  }

  // get the daily execises 
  async function fetchDailyWorkout(userId: string, dayNumber: number) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/daily-workout/${userId}/${dayNumber}`
      );
      if (response.ok) {
        const data = (await response.json()).map((exercise: any) => ({
          ...exercise,
          loggedData: [{ reps: "", weight: "" }],
          previousLogs: null,
          showLogs: false,
          editMode: false,
          completed: false,
        }));

        dailyWorkout = data;
        dailyWorkoutStore.set(data);
      } else {
        console.error("Failed to fetch daily workout.");
      }
    } catch (error) {
      console.error("Error fetching daily workout:", error);
    }
  }

  // get the logs for an exercise 
  async function fetchPreviousLogs(exerciseId: string, exerciseIndex: number) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/exercise-log/${userId}/${exerciseId}`
      );
      if (response.ok) {
        const logs = await response.json();
        dailyWorkout[exerciseIndex].previousLogs = logs;
        dailyWorkout = [...dailyWorkout];
      } else {
        throw new Error("Failed to fetch previous logs.");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  }

  // increment the completed exercises in the daily summary table in the daytabase 
  async function incrementCompletedExercises() {
    const log_date = new Date().toISOString().split("T")[0];

    try {
      const fetchResponse = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/daily-summary?user_id=${userId}&log_date=${log_date}`
      );

      let currentCount = 0;
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        if (data.length > 0) {
          currentCount = data[0].completed_exercises;
        }
      }

      const payload = {
        user_id: userId,
        log_date,
        completed_exercises: currentCount + 1,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/daily-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update completed exercises.");
      }
    } catch (error) {
      console.error("Error incrementing completed exercises:", error);
    }
  }



  // calculate the curent day to pass to the fetch functions from the day of starting the plan 
  function calculateCurrentDay(startDate: string): number {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    const difference = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    return (difference % 21) + 1;
  }

  // update the plans on day change (midnight)
  function scheduleMidnightUpdate() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      fetchPreferencesAndData();
      dailyWorkoutStore.set([]);
      scheduleMidnightUpdate();
    }, msUntilMidnight);
  }

  
  function updateExerciseLog(exerciseId: string, updateFn: (exercise: DailyWorkoutExercise) => void) {
    const exercise = dailyWorkout.find((e) => e.exercise_id === exerciseId);
    if (exercise) {
      updateFn(exercise);
      dailyWorkout = [...dailyWorkout];
    }
  }

  //add a set to the exercise 
  function addSet(exerciseId: string) {
    updateExerciseLog(exerciseId, (exercise) => {
      if (exercise.loggedData.length < MAX_SETS) {
        exercise.loggedData.push({ reps: "", weight: "" });
      }
    });
  }

  async function saveWorkout(exerciseId: string) {
    const exercise = dailyWorkout.find((e) => e.exercise_id === exerciseId);
    if (!exercise) return;

    let hasError = false;
    exercise.loggedData.forEach((set) => {
      if (!set.reps || !Number.isInteger(Number(set.reps)) || Number(set.reps) <= 0) {
        set.error = "Reps must be a positive integer.";
        hasError = true;
      } else {
        set.error = null;
      }

      if (!set.weight || (!Number.isFinite(Number(set.weight)) && typeof set.weight !== "string")) {
        set.error = set.error || "Weight must be valid.";
        hasError = true;
      }
    });

    if (hasError) {
      showToast("Fix errors before saving.", "error");
      dailyWorkout = [...dailyWorkout];
      return;
    }

    const payload = {
      user_id: userId,
      exercise_id: exerciseId.trim(),
      sets: exercise.loggedData.map((set, index) => ({
        set_number: index + 1,
        reps: set.reps,
        weight: set.weight,
        logged_at: new Date().toISOString().split("T")[0],
      })),
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/exercise-log`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await fetchPreviousLogs(exerciseId, dailyWorkout.indexOf(exercise));
        exercise.completed = true;
        exercise.editMode = false;
        showToast(`${exercise.exercise_name} saved!`, "success");
        dailyWorkout = [...dailyWorkout];
        incrementCompletedExercises();
      } else {
        showToast("Failed to save workout.", "error");
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      showToast("An error occurred.", "error");
    }
  }

  

  // UI Helpers
  function toggleEditMode(exerciseId: string) {
    const exercise = dailyWorkout.find((e) => e.exercise_id === exerciseId);
    if (exercise) {
      exercise.editMode = !exercise.editMode;
      if (!exercise.editMode) {
        exercise.completed = false;
      }
      dailyWorkout = [...dailyWorkout];
    }
  }
  // delete from localc storage and database 
  function deleteSet(exerciseId: string, index: number) {
    const exercise = dailyWorkout.find((e) => e.exercise_id === exerciseId);
    if (!exercise) return;

    deleteSetFromDB(exerciseId, index + 1).then(() => {
      exercise.loggedData.splice(index, 1);
      dailyWorkout = [...dailyWorkout];
    });
  }

  // function to remove the set from the datbase 
  async function deleteSetFromDB(exerciseId: string, setNumber: number) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/exercise-log`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            exercise_id: exerciseId,
            set_number: setNumber,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete set.");
      }

      showToast("Set deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting set:", error);
      showToast("Failed to delete set.", "error");
    }
  }

  function showToast(message: string, type: "success" | "error") {
    toastMessage = message;
    toastType = type;

    setTimeout(() => {
      toastMessage = null;
      toastType = null;
    }, 3000);
  }
</script>

<!-- Tabs -->
<div class="tabs">
  <button
    on:click={() => (activeTab = "daily")}
    class="tab {activeTab === 'daily' ? 'active-tab' : ''}"
  >
    Daily Plan
  </button>
  <button
    on:click={() => (activeTab = "weekly")}
    class="tab {activeTab === 'weekly' ? 'active-tab' : ''}"
  >
    Weekly Plan
  </button>
</div>

<!-- Toast Notification -->
{#if toastMessage}
  <div class="toast {toastType === 'error' ? 'error-toast' : ''}">
    {toastMessage}
  </div>
{/if}

<!-- Weekly Plan -->
{#if activeTab === "weekly"}
  <div class="weekly-plan">
    <h2>Weekly Plan</h2>
    {#if weeklyPlan.length > 0}
      {#each weeklyPlan as day, index}
        <div class="weekly-card {day.is_rest ? 'rest-day' : 'workout-day'}">
          <h3>
            {new Date(Date.now() + index * 86400000).toDateString().split(" ").slice(0, 3).join(" ")}
          </h3>
          <p class="day-name">{day.day_name}</p>
          {#if day.is_rest}
            <p class="rest-day-text">💤 Today you rest, you earned it!</p>
          {:else}
            <p class="exercises-count">{day.num_exercises} exercises</p>
          {/if}
        </div>
      {/each}
    {:else}
      <p>No weekly plan available.</p>
    {/if}
  </div>
{/if}

<!-- Daily Workout -->
{#if activeTab === "daily"}
  <div class="daily-workout">
    <h2>Daily Workout</h2>
    {#each dailyWorkout as exercise, index}
      <div class="exercise-card {exercise.completed ? 'completed' : ''}">
        <details class="exercise-details" bind:open={expandedExercises[exercise.exercise_id]}>
          <summary>
            <strong>{exercise.exercise_name}</strong>
            <p class="exercise-description">{exercise.description}</p>
            {#if exercise.completed}
              ✅
            {/if}
          </summary>

          <!-- Log Current Sets -->
          {#each exercise.loggedData as set, setIndex}
          <div class="set-entry">
            <p>Set {setIndex + 1}:</p>
            <div class="set-row">
              <label>
                <span class="set-label">Reps:</span>
                <input
                  type="number"
                  bind:value={set.reps}
                  placeholder="Enter reps"
                  class="set-input"
                />
              </label>
              <label>
                <span class="set-label">Weight:</span>
                <input
                  type="text"
                  bind:value={set.weight}
                  placeholder="Enter weight"
                  class="set-input"
                />
              </label>
              <button on:click={() => deleteSet(exercise.exercise_id, setIndex)} class="icon-button">
                <img src="/delete.png" alt="Delete Set" class="icon" />
              </button>
            </div>
            {#if set.error}
              <p class="input-error">{set.error}</p>
            {/if}
          </div>
          {/each}

          <!-- Action Buttons -->
          <div class="action-buttons">
            {#if !exercise.completed || exercise.editMode}
              <button on:click={() => addSet(exercise.exercise_id)} class="add-set-button">
                Add Set
              </button>

              <button on:click={() => saveWorkout(exercise.exercise_id)} class="save-button">
                {exercise.editMode ? "Save Changes" : "Save"}
              </button>
            {/if}
            <button on:click={() => toggleEditMode(exercise.exercise_id)} class="edit-button">
              {exercise.editMode ? "Cancel Edit" : "Edit"}
            </button>
            <button on:click={() => {
              if (!exercise.previousLogs) {
                fetchPreviousLogs(exercise.exercise_id, index);
              }
              exercise.showLogs = !exercise.showLogs;
            }} class="previousLog-button">
              {exercise.showLogs ? "Hide Previous Logs" : "Show Previous Logs"}
            </button>
          </div>

          <!-- Previous Logs -->
          {#if exercise.showLogs && exercise.previousLogs}
            <div class="previous-logs">
              <h3>Previous Logs</h3>
              {#each Object.entries(exercise.previousLogs) as [date, logs]}
                <div class="log-session">
                  <p><strong>Date:</strong> {new Date(date).toDateString()}</p>
                  {#each logs as log}
                    <p>Set {log.set_number}: {log.reps} reps @ {log.weight}</p>
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
        </details>
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Tabs */
  .tabs {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
    background-color: #f0f0f0;
    padding: 10px;
    border-radius: 10px;
  }

  .tab {
    flex: 1;
    padding: 10px;
    text-align: center;
    border: none;
    background-color: #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    color: #333;
  }

  .active-tab {
    background-color: #007bff;
    color: white;
  }

  /* Toast Notification */
  .toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background-color: green;
    color: white;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  }

  .toast.error-toast {
    background-color: #dc3545;
  }

  /* Weekly Plan */
  .weekly-plan {
    margin-top: 20px;
  }

  .weekly-card {
    padding: 15px;
    background-color: #f9f9f9;
    margin-bottom: 15px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .rest-day {
    background-color: #eeeeee;
  }

  .workout-day {
    background-color: #e0f7fa;
  }

  /* Daily Workout */
  .daily-workout {
    padding: 20px;
  }

  .exercise-card {
    padding: 20px;
    background-color: #ffffff;
    margin-bottom: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .exercise-card.completed {
    background-color: #e6ffe6;
  }

  .exercise-details {
    padding: 10px;
  }

  .exercise-description {
    font-size: 0.9rem;
    color: #666666;
    margin-bottom: 10px;
  }

  /* Set Entry */
  .set-entry {
    margin-bottom: 15px;
  }

  .set-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .set-label {
    font-weight: bold;
    color: #333;
    margin-right: 5px;
  }

  .set-input {
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
    flex: 1;
    min-width: 80px;
  }

  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon {
    width: 20px;
    height: 20px;
  }

  /* Buttons */
  .action-buttons {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  .add-set-button {
    background-color: #007bff;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    flex: 1;
  }

  .save-button {
    background-color: #28a745;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    flex: 1;
  }

  .edit-button {
    background-color: #ffc107;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    flex: 1;
  }

  .previousLog-button{
    background-color: #007bff;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    flex: 1;
  }
</style>
