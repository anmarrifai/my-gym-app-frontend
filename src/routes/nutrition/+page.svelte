<script lang="ts">

  import { searchFood, getFoodNutrition } from "$lib/api";
  import { Preferences } from "@capacitor/preferences";
  import { onMount, onDestroy , tick } from "svelte"; 
  import { goto } from '$app/navigation';
  import { Chart, registerables } from "chart.js";
  import {auth} from "$lib/firebaseConfig"; 
  import flatpickr from "flatpickr";
  import "flatpickr/dist/flatpickr.css";
  import type { Instance } from "flatpickr/dist/types/instance";
  import type { LoggedFood } from "$lib/types/loggedFood";
  import SummarySection from "../../lib/components/SummarySection.svelte";
  import moment from "moment";




   // Interfaces
   interface FoodItem {
    food_name: string;
    serving_qty: number;
    serving_unit: string;
    serving_weight_grams: number;
  }

  interface FoodNutrition {
    food_name: string;
    nf_calories: number;
    nf_protein: number;
    nf_total_carbohydrate: number;
    nf_total_fat: number;
    serving_qty: number;
    serving_unit: string;
    serving_weight_grams: number;
  }

  interface LogResponse {
    log_id: number;
    user_id: string;
    log_date: string;
    food_name: string;
    weight_grams: string;
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
    created_at: string;
    updated_at: string;
    synced: boolean;
  }

  // Register Chart.js components
  Chart.register(...registerables);

  // State Variables
  let searchQuery = "";
  let searchResults: FoodItem[] = [];
  let selectedFood: FoodNutrition | null = null;
  let customWeight: number | null = null;
  let adjustedNutrition: FoodNutrition | null = null;
  let dailyLog: LoggedFood[] = [];
  let isLoading = false;
  let isManualEntryOpen = false;
  let userId: string | null = null;
  let calendar: flatpickr.Instance | flatpickr.Instance[] | null = null;
  let currentFetchController: AbortController | null = null;
  let selectedDate: string = new Date().toISOString().split("T")[0];
  let availableDates: string[] = [selectedDate];
  let dailyLogsByDate: Record<string, LoggedFood[]> = {};
  let manualFood = { name: "", weight: "", calories: "", protein: "", carbs: "", fats: "" };
  let toastMessage: string = "";
  let showToast: boolean = false;
  let caloricNeeds: { dailyCalories: number; protein: number; carbs: number; fats: number } | null = null;
  let calorieChartRef: Chart | null = null;
  let loggedCalories = 0;
  let touchStartX = 0;
  let completedDates: string[] = [];
  let isCalendarOpen = false;


 
  
  // get the logs from database 
  async function fetchLogs() {
  try {
    const userId = auth.currentUser?.uid; 

    if (!userId) {
      throw new Error("User not logged in!");
    }
    
     if (currentFetchController) {
      currentFetchController.abort();
    }

    currentFetchController = new AbortController();
    const { signal } = currentFetchController;

    
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_BASE_URL}/api/food-logs?user_id=${userId}&log_date=${selectedDate}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch food logs from the database");
    }

    // Parse the response and format it as dailyLog
    const logs: LogResponse[] = await response.json();

    dailyLog = logs.map((log): LoggedFood => ({
      name: log.food_name,
      weight: parseFloat(log.weight_grams),
      calories: parseFloat(log.calories),
      protein: parseFloat(log.protein),
      carbs: parseFloat(log.carbs),
      fats: parseFloat(log.fats),
    }));

    dailyLog = [...dailyLog];

    currentFetchController = null; 
  
  } catch (error) {
    console.error("Error fetching food logs:", error);
    dailyLog = []; 
  }
}


async function setSelectedDate(newDate: string) {
  selectedDate = newDate; 
  await fetchLogs(); 
}


  async function fetchCaloricNeeds() {
    const { value } = await Preferences.get({ key: "calorieData" });
    if (value) {
      caloricNeeds = JSON.parse(value);
    }
  }

  onMount(async () => {
    const user = auth.currentUser;
    if (user) {
      userId = user.uid;
    }
    
    const allKeys = (await Preferences.keys()).keys;
    const dateKeys = allKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
    availableDates = Array.from(new Set([...availableDates, ...dateKeys])); 
    await fetchLogs(); 
    await fetchCaloricNeeds(); 
    
    
   
    if (navigator.onLine) {
      await syncLogsWithServer();
    }

    const logSection = document.querySelector(".daily-log-section");
    logSection?.addEventListener("touchstart", handleTouchStart as EventListener);
    logSection?.addEventListener("touchend", handleTouchEnd as EventListener);

    // sync periodicaly 
    setInterval(async () => {
      if (navigator.onLine) {
        await syncLogsWithServer();
      }
    }, 10 * 60 * 1000);

  });
  

  window.addEventListener("online", async () => {
    await syncLogsWithServer();
  });


 

  // save logs locally
  async function saveLogs() {
    await Preferences.set({ key: selectedDate, value: JSON.stringify(dailyLog) });
  }


  async function fetchCompletedDates() {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/daily-summary/calendar?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch daily summaries");

      const data = await response.json();
      

     
      completedDates = data.map((entry: { log_date: string }) => entry.log_date.split("T")[0]); // Strip time
      
    } catch (error) {
      console.error("Error fetching completed dates:", error);
    }
  }



  

  onMount(() => {
    fetchCompletedDates();
  });




  // get nutrtion for selected food 
  async function handleSelectFood(foodName: string) {
    isLoading = true;
    try {
      const data = await getFoodNutrition(foodName);
      const foodData = data.foods[0];

      selectedFood = {
        food_name: foodData.food_name,
        nf_calories: foodData.nf_calories,
        nf_protein: foodData.nf_protein,
        nf_total_carbohydrate: foodData.nf_total_carbohydrate,
        nf_total_fat: foodData.nf_total_fat,
        serving_qty: foodData.serving_qty,
        serving_unit: foodData.serving_unit,
        serving_weight_grams: foodData.serving_weight_grams,
      };

      customWeight = selectedFood.serving_weight_grams;
      recalculateNutrition(customWeight);
      searchResults = [];
    } catch (error) {
      console.error("Error fetching food data:", error);
    } finally {
      isLoading = false;
    }
  }

  function debounce(func: Function, delay: number) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}


let searchResult: string[] = []; // 

// debonce to limit the number of requests 
const handleAutocomplete = debounce(async () => {
  if (searchQuery.trim() === "") {
    searchResult = [];
    return;
  }

  try {
    const data = await searchFood(searchQuery); // Call Nutritionix API
   
    searchResult = data.common.slice(0, 6).map((item: { food_name: string }) => item.food_name);
  } catch (error) {
    console.error("Error fetching food suggestions:", error);
    searchResult = [];
  }
}, 300); 

// auto compelte 
async function selectFoodSuggestion(foodName: string) {
  searchQuery = foodName; 
  searchResult = []; 
  await handleSelectFood(foodName); 
}




  // recalculate on weight change 
  function recalculateNutrition(weightInGrams: number) {
    if (!selectedFood) return;

    const ratio = weightInGrams / selectedFood.serving_weight_grams;
    adjustedNutrition = {
      ...selectedFood,
      nf_calories: selectedFood.nf_calories * ratio,
      nf_protein: selectedFood.nf_protein * ratio,
      nf_total_carbohydrate: selectedFood.nf_total_carbohydrate * ratio,
      nf_total_fat: selectedFood.nf_total_fat * ratio,
    };
  }

  // add food to log 
  async function addToLog() {
    if (!adjustedNutrition) return;

    dailyLog = [
      ...dailyLog,
      {
        name: adjustedNutrition.food_name,
        weight: customWeight ?? adjustedNutrition.serving_weight_grams,
        calories: adjustedNutrition.nf_calories,
        protein: adjustedNutrition.nf_protein,
        carbs: adjustedNutrition.nf_total_carbohydrate,
        fats: adjustedNutrition.nf_total_fat,
        isSynced: false,
      },
    ];

    await saveLogs();
    if (navigator.onLine) {
      await syncLogsWithServer();
    } 
    clearSelection();
  }

 
  function clearSelection() {
    selectedFood = null;
    adjustedNutrition = null;
    customWeight = null;
    searchQuery = "";
  }

 
  async function addManualFood() {
    const { name, weight, calories, protein, carbs, fats } = manualFood;

    
    if (!name.trim() || !weight || !calories || !protein || !carbs || !fats) {
      showToastMessage("Please fill in all fields with valid values.");
      return;
    }
    if (
      Number(weight) <= 0 ||
      Number(calories) < 0 ||
      Number(protein) < 0 ||
      Number(carbs) < 0 ||
      Number(fats) < 0
      
    ) {
      showToastMessage("Invalid values. Ensure weight > 0 and macronutrients >= 0.");
      return;
    }

  
    dailyLog = [
      ...dailyLog,
      {
        name,
        weight: Number(weight),
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fats: Number(fats),
        isSynced: false, 
      },
    ];

    await saveLogs();
    manualFood = { name: "", weight: "", calories: "", protein: "", carbs: "", fats: "" };
    showToastMessage("Food added successfully!");
   
    if (navigator.onLine) {
      await syncLogsWithServer();
    } else {
      console.log("No internet connection. Log saved locally.");
    }
    
    isManualEntryOpen = false;
  }

 
  
  function enterEditMode(index: number) {
    dailyLog[index].isEditing = true;
    dailyLog[index].tempWeight = dailyLog[index].weight; 
    dailyLog = [...dailyLog]; 
  }



async function saveEdit(index: number) {
  const item = dailyLog[index];
  const tempWeight = item.tempWeight || 0; 

  if (tempWeight > 0 && tempWeight <= 1000) {
    const ratio = tempWeight / item.weight;

   
    const updatedItem = {
      ...item,
      weight: tempWeight,
      calories: item.calories * ratio,
      protein: item.protein * ratio,
      carbs: item.carbs * ratio,
      fats: item.fats * ratio,
      isEditing: false, 
    };

    try {
      
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/food-logs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId, 
          log_date: selectedDate, 
          food_name: item.name,
          weight_grams: item.weight, 
          new_weight: tempWeight, 
          calories: updatedItem.calories,
          protein: updatedItem.protein,
          carbs: updatedItem.carbs,
          fats: updatedItem.fats,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        
        dailyLog[index] = updatedItem;

        dailyLogsByDate[selectedDate] = dailyLog;
        await Preferences.set({
          key: selectedDate,
          value: JSON.stringify(dailyLog),
        });


        
        showToastMessage("Food log updated successfully.");
      } else {
        console.error("API error:", result.error);
        showToastMessage(result.error || "Failed to update the food log.");
      }
    } catch (error) {
      console.error("Network error:", error);
      showToastMessage("Network error occurred while updating the food log.");
    }

    dailyLog = [...dailyLog]; 
  } else {
    showToastMessage("Please enter a valid weight (1-1000 grams).");
  }
}

 
  function cancelEdit(index: number) {
    dailyLog[index].isEditing = false; 
    dailyLog[index].tempWeight = dailyLog[index].weight; 
    dailyLog = [...dailyLog]; 
  }
  
  async function deleteLog(index: number) {
  const logToDelete = dailyLog[index]; 

  
  const payload = {
    user_id: userId, 
    log_date: selectedDate, 
    food_name: logToDelete.name, 
    weight_grams: logToDelete.weight, 
  };

  try {
    
    const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/food-logs`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      
      
      dailyLog.splice(index, 1); 
      dailyLogsByDate[selectedDate] = dailyLog;
      await Preferences.set({
        key: selectedDate,
        value: JSON.stringify(dailyLog),
      });

      dailyLog = [...dailyLog]; 
    } else {
      const errorData = await response.json();
      console.error("Failed to delete food log:", errorData);
      showToastMessage("Failed to delete the food log. Please try again.");
    }
  } catch (error) {
    console.error("Error deleting food log:", error);
    showToastMessage("Network error occurred. Could not delete the log.");
  }
}

  

  async function syncLogsWithServer() {
    if (!userId) {
      showToastMessage("User not authenticated. Cannot sync logs.");
      return;
    }

    const unsyncedLogs = dailyLog.filter((log) => !log.isSynced);

    if (unsyncedLogs.length === 0) return; // Nothing to sync

    const payload = {
      user_id: userId,
      logs: unsyncedLogs.map((log) => ({
        log_date: selectedDate,
        food_name: log.name,
        weight_grams: log.weight,
        calories: log.calories,
        protein: log.protein,
        carbs: log.carbs,
        fats: log.fats,
      })),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/food-logs/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Mark logs as synced
        dailyLog = dailyLog.map((log) =>
          log.isSynced ? log : { ...log, isSynced: true }
        );

        await saveLogs();
        showToastMessage("Logs synced successfully!");
      } else {
        console.error("Sync failed:", await response.text());
        showToastMessage("Failed to sync logs. Will retry later.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      showToastMessage("An error occurred. Sync failed.");
    }
  }


  function cancelSelection() {
    clearSelection();
  }

  function loadPreviousDate() {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    selectedDate = previousDate.toISOString().split("T")[0];
    setSelectedDate(selectedDate);
  }

  function loadNextDate() {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    selectedDate = nextDate.toISOString().split("T")[0];
    setSelectedDate(selectedDate);
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.changedTouches[0].screenX;
    
  }

  function handleTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].screenX;
    const threshold = 50; 

    if (touchStartX - touchEndX > threshold) {
      loadNextDate(); 
    } else if (touchEndX - touchStartX > threshold) {
      loadPreviousDate(); 
    }
  }

  
  function showToastMessage(message: string) {
    toastMessage = message;
    showToast = true;
    setTimeout(() => (showToast = false), 3000); 
  }

  
  function toggleCalendar() {
    isCalendarOpen = !isCalendarOpen;

    if (isCalendarOpen) {
    
      tick().then(() => {
        if (!calendar) {
          initializeCalendar(); 
        } else {
          
          if (calendar) {
            (calendar as flatpickr.Instance).destroy();
          }
          initializeCalendar();
        }
      });
    }
  }

  function initializeCalendar() {
    calendar = flatpickr("#calendar", {
      inline: true,
      altInput: true,
      dateFormat: "YYYY-MM-DD",
      altFormat: "DD-MM-YYYY",
      allowInput: true,
      defaultDate: selectedDate,
      parseDate: (datestr, format) => {
        return moment(datestr, format, true).toDate(); 
      },
      formatDate: (date, format) => {
        return moment(date).format(format); 
      },
      onChange: (selectedDates) => {
        if (selectedDates[0]) {
          const utcDate = new Date(
            selectedDates[0].getTime() -
              selectedDates[0].getTimezoneOffset() * 60000
          )
            .toISOString()
            .split("T")[0];
          selectedDate = utcDate;
          setSelectedDate(selectedDate); 
        }
      },
      onDayCreate: (dObj, dStr, fp, dayElem) => {
        const date = dayElem.dateObj.toISOString().split("T")[0]; 
        if (completedDates.includes(date)) {
          // Apply inline styles for highlighting
          dayElem.style.backgroundColor = "#4caf50";
          dayElem.style.color = "white";
          dayElem.style.borderRadius = "50%";
          dayElem.style.fontWeight = "bold";
        }
      },
    });
  }



function closeCalendarOnOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const calendarContainer = document.querySelector(".calendar-dropdown-container");
  if (!calendarContainer?.contains(target)) {
    isCalendarOpen = false;
  }
}

onMount(() => {
  document.addEventListener("click", closeCalendarOnOutsideClick);
});

onDestroy(() => {
  document.removeEventListener("click", closeCalendarOnOutsideClick);
});


</script>



<div class="app-container">
  <header class="header-container">
    <h1 class="page-title">Nutrition</h1>
    <div class="date-navigation">
      <button class="arrow-button" on:click={loadPreviousDate}>&lt;</button>
      <div class="selected-date-container">
        
        <div class="calendar-dropdown-container">
          <button class="calendar-toggle" on:click={toggleCalendar}>
            <img src="calendar.png" alt="Calendar Icon" class="calendar-icon" />
          </button>
          {#if isCalendarOpen}
            <div class="calendar-dropdown">
              <div id="calendar"></div>
            </div>
          {/if}
        </div>
        <h2 class="selected-date">{selectedDate}</h2>
      </div>
      <button class="arrow-button" on:click={loadNextDate}>&gt;</button>
    </div>
  
  </header>
  <!-- Calendar Section -->
  <button class="update-needs-button" on:click={() => goto ('/calorie-calculator')}>
    Update Needs
  </button>


  <section class="summary-section">
    <SummarySection {dailyLog} />
  </section>


  <button class="update-needs-button" on:click={() => goto ('/calorie-calculator')}>
    Update Needs
  </button>
  <!-- Search and Food Details Section -->
  <section class="search-section">
    <div class="search-container">
      <h4> Search: </h4>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search food..."
        on:input={handleAutocomplete}
        class="search-input"
      />
      {#if searchResult.length > 0}
        <ul class="autocomplete-dropdown">
          {#each searchResult as foodName}
            <li class="autocomplete-item" on:click={() => selectFoodSuggestion(foodName)}>
              {foodName}
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if selectedFood}
      <div class="selected-food-details">
        <h3>{selectedFood.food_name}</h3>
        <p>Default Serving: {selectedFood.serving_qty} {selectedFood.serving_unit} ({selectedFood.serving_weight_grams} g)</p>
        <label>
          Your Serving (grams):
          <input
            type="number"
            bind:value={customWeight}
            on:input={(e) => recalculateNutrition(Number((e.target as HTMLInputElement).value))}
            min="1"
            max="1000"
            class="serving-field"
          />
        </label>
        {#if adjustedNutrition}
          <p>Calories: {adjustedNutrition.nf_calories.toFixed(2)} kcal</p>
          <p>Protein: {adjustedNutrition.nf_protein.toFixed(2)} g</p>
          <p>Carbs: {adjustedNutrition.nf_total_carbohydrate.toFixed(2)} g</p>
          <p>Fats: {adjustedNutrition.nf_total_fat.toFixed(2)} g</p>
          <button on:click={addToLog} class="action-button">Add to Log</button>
          <button on:click={cancelSelection} class="cancel-button">Cancel</button>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Manual Food Entry Section -->
  <section class="manual-entry-section">
    <details bind:open={isManualEntryOpen}>
      <summary>Enter Food Manually</summary>
      <div class="manual-entry">
        <label>
          Food Name:
          <input type="text" bind:value={manualFood.name} placeholder="Enter food name" class="input-field"/>
        </label>
        <label>
          Weight (grams):
          <input type="number" bind:value={manualFood.weight} min="1" placeholder="Weight in grams" class="input-field" />
        </label>
        <label>
          Calories (kcal):
          <input type="number" bind:value={manualFood.calories} min="0" placeholder="Calories"  class="input-field"/>
        </label>
        <label>
          Protein (g):
          <input type="number" bind:value={manualFood.protein} min="0" placeholder="Protein"  class="input-field"/>
        </label>
        <label>
          Carbs (g):
          <input type="number" bind:value={manualFood.carbs} min="0" placeholder="Carbs" class="input-field"/>
        </label>
        <label>
          Fats (g):
          <input type="number" bind:value={manualFood.fats} min="0" placeholder="Fats" class="input-field"/>
        </label>
        <button on:click={addManualFood} class="action-button">Add Food</button>
      </div>
    </details>
  </section>

  <!-- Daily Log Section -->
  <section class="daily-log-section">
    <div class="log-header">
      <h2>Daily Log</h2>
      <button class="sync-button" on:click={syncLogsWithServer}>
        <img src="sync.png" alt="Sync Icon"  class="sync-icon"/>
      </button>
    </div>

    {#if dailyLog.length > 0}
      <div class="food-log-container">
        {#each dailyLog as item, index}
          <div class="food-log-card">
            <div class="food-log-details">
              <strong>{item.name}</strong>
              <p>Calories: {item.calories.toFixed(2)} kcal</p>
              <p>Serving: {item.weight}g</p>
            
              <div class="macros">
                <span>Protein: {item.protein.toFixed(2)}g</span>
                <span>Carbs: {item.carbs.toFixed(2)}g</span>
                <span>Fats: {item.fats.toFixed(2)}g</span>
              </div>
            </div>

            <div class="food-log-actions">
              {#if item.isEditing}
                <label>
                  Edit Weight (grams):
                  <input
                    type="number"
                    bind:value={item.tempWeight}
                    min="1"
                    max="1000"
                    class="input-field"
                  />
                </label>
                <button on:click={() => saveEdit(index)} class="action-button">Save</button>
                <button on:click={() => cancelEdit(index)} class="cancel-button">Cancel</button>
              {:else}
                <button on:click={() => enterEditMode(index)} class="action-button">Edit</button>
                <button class="delete-button" on:click={() => deleteLog(index)}>Delete</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p>No food items logged for this date.</p>
    {/if}
  </section>
</div>
{#if showToast}
  <div class="toast">{toastMessage}</div>
{/if}

<style>


.app-container {
  
  position: relative;
  max-width: 550px;
  min-height: 100vh;
  display: flex;
  margin: 0 auto;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 25px;
  box-sizing: border-box;
  overflow-x: hidden;
}
.header-container {
  position: fixed; 
  top: 0; 
  width: 100%; 
  z-index: 1000; 
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background-color: #006664;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
.date-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}
.calendar-icon {
  width: 24px;
  height: 24px;
  vertical-align: middle;
}

.sync-icon {
  width: 20px;
  height: 20px;
}
.arrow-button {
  background: transparent;
  border: 2px solid #ffffff;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  color: #ffffff;
  font-size: 1.5rem;
  cursor: pointer;
}

.arrow-button:hover {
  background-color: #ffffff;
  color: #003466;
}

.selected-date-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-date {
  font-size: 1.2rem;
  font-weight: bold;
}


.summary-section {
  margin-top: 80px; 
}

.calendar-dropdown-container {
  position: relative;
  margin-top: var(--spacing);
}
.calendar-toggle {
  background:#006664 ;
  color: #ffffff;
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.calendar-dropdown {
  background-color: #ffffff;
  color: #003466;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}



.update-needs-button {
  background-color: #4caf50;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 1rem;
  margin: 1rem;
  align-self: center;
}

.update-needs-button:hover {
  background-color: #66bb6a;
}



/* Search Section */
.search-container {
  position: relative;
  margin: 1rem auto;
  max-width: 500px;
  color: black;
}

.search-section {
  background-color: #f0f0f0;
  color: black;
  border: 2px solid #ffffff;
  border-radius: 8px;
  margin: 1rem;
  padding: 1rem;
  
}

/* Search Input */
.search-container input {
  width: 90%;
  padding: 0.75rem;
  border: 2px solid #ffffff;
  border-radius: 8px;
  background-color: #ffffff;
  color: #003466;
  font-size: 1rem;
}

.search-container input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
}

.search-container input::placeholder {
  color: #a9a9a9;
}

/* Autocomplete Dropdown */
.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #ccc;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Dropdown Items */
.autocomplete-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: #003466;
  font-size: 0.95rem;
  transition: background 0.3s ease, color 0.3s ease;
}

.autocomplete-item:hover {
  background: #f0f0f0;
  
}

.autocomplete-item:not(:last-child) {
  border-bottom: 1px solid #e0e0e0;
}

/* Input Field */
.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ffffff;
  border-radius: 8px;
  background-color: #ffffff;
  color: #003466;
  font-size: 1rem;
}

.input-field:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
}

.input-field::placeholder {
  color: #a9a9a9;
}
.serving-field{
  width: 40%;
}


/* Daily Log Section */
.daily-log-section {
  margin-top: 20px;
  margin-bottom: 60px;
}


.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing);
}

.food-log-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.food-log-card {
  background: white;
  border: 1px solid #ccc;
  padding: 15px;
  border-radius: 8px;
}

.food-log-details strong {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .food-log-details .macros {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .action-button {
  background-color: #4caf50;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.action-button:hover {
  background-color: #66bb6a;
}

.cancel-button {
  background-color: #e60000;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.cancel-button:hover {
  background-color: #ff4d4d;
}

.delete-button {
  background-color: #ff4d4d;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.delete-button:hover {
  background-color: #e60000;
}

/* Manual Entry Section */
.manual-entry-section {
  margin-top: 15px;
  background: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.manual-entry label {
  display: block;
  margin-bottom: 10px;
}
.manual-entry .input-field {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.input-field::placeholder {
  color: #c0c0c0;
}




</style>