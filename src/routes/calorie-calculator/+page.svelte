<script lang="ts">
  
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Preferences } from "@capacitor/preferences";
  import axios from "axios";

  
  let formType: "calculator" | "manual" = "calculator";


  let age = "";
  let gender = "male"; 
  let height = ""; 
  let weight = "";
  let activityLevel = "sedentary"; 
  let goal = "maintenance"; 

  let dailyCalories = ""; 
  let proteinPercentage = 40;
  let carbPercentage = 40;
  let fatPercentage = 20;

  let isLoading = false; 
  let errorMessage: string | null = null; 

  // API Configuration
  const apiBaseUrl = `${import.meta.env.VITE_CALORIE_BASE_URL}`;
  const apiHeaders = {
    "x-rapidapi-key": `${import.meta.env.VITE_XRAPIDKEY}`, // Replace this with your actual API k
    "x-rapidapi-host": `${import.meta.env.VITE_XRAPIDHOST}`,
    "Content-Type": "application/json",
  };

  // Save data to Capacitor Preferences and redirect to Nutrition page
  async function saveCalorieData(calories: number, protein: number, carbs: number, fats: number) {
    const calorieData = { dailyCalories: calories, protein, carbs, fats };
    await Preferences.set({ key: "calorieData", value: JSON.stringify(calorieData) });
    goto("/nutrition"); // Redirect to Nutrition page
  }

  // Handle API-based calorie calculation
  async function handleCalculatorSubmit() {
    if (!age || !height || !weight) {
      alert("Please fill in all required fields.");
      return;
    }

    isLoading = true; // Show loading state
    errorMessage = null; // Reset previous error

    const requestData = {
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      gender,
      activity_level: activityLevel,
      goal,
      equation: "mifflin", // Use Mifflin-St Jeor Equation
    };

    try {
      const response = await axios.post(apiBaseUrl, requestData, { headers: apiHeaders });
      const data = response.data;

      if (data.caloric_needs) {
        const calories = parseFloat(data.caloric_needs.calories); 
        const protein = (calories * proteinPercentage) / 400; // 1g protein = 4 kcal
        const carbs = (calories * carbPercentage) / 400;
        const fats = (calories * fatPercentage) / 900; // 1g fat = 9 kcal

        await saveCalorieData(calories, protein, carbs, fats);
      } else {
        errorMessage = "Failed to calculate caloric needs. Please try again.";
      }
    } catch (error) {
      errorMessage = "An error occurred while fetching caloric needs. Please check your inputs or try again later.";
      console.error("API Error:", error);
    } finally {
      isLoading = false; // hide loading
    }
  }

  // Handle manual calorie entry
  async function handleManualSubmit() {
    if (!dailyCalories || proteinPercentage + carbPercentage + fatPercentage !== 100) {
      alert("Please enter valid values. Macronutrient percentages must total 100%.");
      return;
    }

    const calories = Number(dailyCalories);
    const protein = (calories * proteinPercentage) / 400; // 1g protein = 4 kcal
    const carbs = (calories * carbPercentage) / 400;
    const fats = (calories * fatPercentage) / 900;

    await saveCalorieData(calories, protein, carbs, fats);
  }
</script>

<h1>Calorie Calculator</h1>

<!-- Form Toggle -->
{#if formType === "calculator"}
  <form on:submit|preventDefault={handleCalculatorSubmit}>
    <label>
      Age:
      <input type="number" bind:value={age} min="1" required />
    </label>
    <label>
      Gender:
      <select bind:value={gender}>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </label>
    <label>
      Height (cm):
      <input type="number" bind:value={height} min="1" required />
    </label>
    <label>
      Weight (kg):
      <input type="number" bind:value={weight} min="1" required />
    </label>
    <label>
      Activity Level:
      <select bind:value={activityLevel}>
        <option value="sedentary">Sedentary</option>
        <option value="lightly_active">Light Activity</option>
        <option value="moderately_active">Moderate Activity</option>
        <option value="very_active">Very Active</option>
        <option value="extra_active">Super Active</option>
      </select>
    </label>
    <label>
      Goal:
      <select bind:value={goal}>
        <option value="weight_loss">Weight Loss</option>
        <option value="maintenance">Maintenance</option>
        <option value="weight_gain">Muscle Gain</option>
      </select>
    </label>
    <button type="submit" disabled={isLoading}>
      {isLoading ? "Calculating..." : "Calculate"}
    </button>
  </form>
  {#if errorMessage}
    <p style="color: red;">{errorMessage}</p>
  {/if}
  <p>Or if you know your caloric needs:</p>
  <button on:click={() => (formType = "manual")}>Enter Manually</button>
{/if}

<!-- Manual Entry -->
{#if formType === "manual"}
  <form on:submit|preventDefault={handleManualSubmit}>
    <label>
      Daily Calories:
      <input type="number" bind:value={dailyCalories} min="1" required />
    </label>
    <label>
      Protein (%):
      <input type="number" bind:value={proteinPercentage} min="0" max="100" required />
    </label>
    <label>
      Carbs (%):
      <input type="number" bind:value={carbPercentage} min="0" max="100" required />
    </label>
    <label>
      Fats (%):
      <input type="number" bind:value={fatPercentage} min="0" max="100" required />
    </label>
    <p>
      Total: {proteinPercentage + carbPercentage + fatPercentage}% (should equal 100%)
    </p>
    <button type="submit">Save</button>
  </form>
  <button on:click={() => (formType = "calculator")}>Back to Calculator</button>
{/if}

<style>
 
h1 {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 2rem;
  color: #333333; 
}


form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem; 
  margin: 0 auto;
  max-width: 500px; 
  background-color: #ffffff; 
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); 
}


label {
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  font-weight: bold;
  color: #333333; 
}

input,
select {
  margin-top: 0.5rem;
  padding: 0.75rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #cccccc; 
  background-color: #f9f9f9; 
  color: #333333; 
}

input:focus,
select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.3); 
}


button {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: bold;
  color: #ffffff;
  background-color: #007bff; 
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button:hover {
  background-color: #0056b3; 
}

button:disabled {
  background-color: #cccccc; 
  cursor: not-allowed;
}

button:active {
  transform: scale(0.98); 
}


p[style="color: red;"] {
  font-size: 0.9rem;
  color: #e63946; 
  font-weight: bold;
  text-align: center;
}


p {
  font-size: 0.9rem;
  color: #666666;
  text-align: center;
}

form + p {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #666666; 
}



p:last-of-type {
  font-size: 1rem;
  font-weight: bold;
  text-align: center;
  color: #333333; 
}


@media (max-width: 768px) {
  form {
    padding: 1rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  label {
    font-size: 0.9rem;
  }

  button {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
}

</style>
