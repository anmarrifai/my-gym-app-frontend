<script lang="ts">
  
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Preferences } from "@capacitor/preferences";
  import axios from "axios";

  // State for toggling between calculator and manual entry forms
  let formType: "calculator" | "manual" = "calculator";

  // Input fields for calculator form
  let age = "";
  let gender = "male"; // Default to male
  let height = ""; // cm
  let weight = ""; // kg
  let activityLevel = "sedentary"; // Default activity level
  let goal = "maintenance"; // Default goal

  // Manual entry fields
  let dailyCalories = ""; // User's manual calorie input
  let proteinPercentage = 40;
  let carbPercentage = 40;
  let fatPercentage = 20;

  // API Response and Error Handling
  let isLoading = false; // Loading state for API request
  let errorMessage: string | null = null; // API error message (if any)

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
        const calories = parseFloat(data.caloric_needs.calories); // Extract calories
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
      isLoading = false; // Hide loading state
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
  /* Page Title */
h1 {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 2rem;
  color: #333333; /* Dark gray */
}

/* Form Styling */
form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem; /* Larger spacing between form elements */
  margin: 0 auto;
  max-width: 500px; /* Center the form */
  background-color: #ffffff; /* White background */
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow */
}

/* Label Styling */
label {
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  font-weight: bold;
  color: #333333; /* Dark gray */
}

/* Input and Select Styling */
input,
select {
  margin-top: 0.5rem;
  padding: 0.75rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #cccccc; /* Light gray border */
  background-color: #f9f9f9; /* Light gray background */
  color: #333333; /* Dark gray text */
}

input:focus,
select:focus {
  outline: none;
  border-color: #007bff; /* Blue border on focus */
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.3); /* Blue glow */
}

/* Button Styling */
button {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: bold;
  color: #ffffff; /* White text */
  background-color: #007bff; /* Blue */
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button:hover {
  background-color: #0056b3; /* Darker blue on hover */
}

button:disabled {
  background-color: #cccccc; /* Gray for disabled state */
  cursor: not-allowed;
}

button:active {
  transform: scale(0.98); /* Slight shrink effect on click */
}

/* Error Message Styling */
p[style="color: red;"] {
  font-size: 0.9rem;
  color: #e63946; /* Red for error messages */
  font-weight: bold;
  text-align: center;
}

/* Section Titles */
p {
  font-size: 0.9rem;
  color: #666666; /* Medium gray */
  text-align: center;
}

/* Form Toggle Buttons */
form + p {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #666666; /* Medium gray */
}

form + p button {
  margin-top: 1rem;
  background-color: #4caf50; /* Green */
}

form + p button:hover {
  background-color: #388e3c; /* Darker green */
}

/* Percentage Breakdown */
p:last-of-type {
  font-size: 1rem;
  font-weight: bold;
  text-align: center;
  color: #333333; /* Dark gray */
}

/* Responsive Design */
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
