<script lang="ts">
  import { onMount } from "svelte"; // Lifecycle hook
  import { auth } from "$lib/firebaseConfig"; // Firebase Auth
  import { currentDay, startDate } from '../../lib/store'; // Import the store
  import { splitId } from '../../lib/store';
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  // State variables
  let userId: string | null = null;
  let goal: string = ""; // User's goal
  let splitType: string = ""; // User's split type
  let numberOfDays: string = ""; // Number of training days
  let errorMessage: string | null = null;
  let successMessage: string | null = null;
  let redirectTo = "";
  // Fetch user ID on mount
  onMount(() => {
    const user = auth.currentUser;
    if (user) {
      userId = user.uid;
      fetchPreferences(); // Fetch preferences, including `start_date`
    } else {
      errorMessage = "User is not logged in.";
    }
  });

  $: {
    // Extract the redirect query parameter
    redirectTo = $page.url.searchParams.get("redirect") || "";
  }

  // Fetch user preferences from the backend
  async function fetchPreferences() {
    if (!userId) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/preferences/${userId}`);
      if (response.ok) {
        const data = await response.json();
        startDate.set(data.start_date || null); // Store the start_date
        goal = data.goal; // Prepopulate form if updating
        splitType = data.split_id.slice(0, 12); // Extract split type from split_id
        splitId.set(data.split_id); // Set the split ID in the store
        numberOfDays = data.split_id.slice(12, 13); // Extract number of days from split_id
      } else {
        console.error("Failed to fetch preferences.");
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  }

  // Submit preferences to the backend
  async function submitPreferences() {
    if (!userId || !goal || !splitType || !numberOfDays) {
      errorMessage = "Please fill in all fields.";
      return;
    }

    // Generate split_id dynamically
    const split_id = `${splitType}${numberOfDays}00`;
    const dateToSet = $startDate || new Date().toISOString().split("T")[0]
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          goal,
          split_id,
          days_per_week: parseInt(numberOfDays),
          start_date: dateToSet,
        }),
      });

      if (response.ok) {
        successMessage = "Preferences saved successfully!";
        errorMessage = null;
        fetchPreferences(); // Re-fetch preferences to update `start_date`
        if (redirectTo === "profile") {
          goto("/profile");
        } else {
         
          goto("/dashboard");
        }
      } else {
        const errorData = await response.json();
        errorMessage = errorData.error || "Failed to save preferences.";
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      errorMessage = "An error occurred. Please try again.";
    }
  }

  // Calculate `current_day` dynamically
  function calculateCurrentDay(startDate: string | null): number | null {
    if (!startDate) return null;
    const start = new Date(startDate).getTime(); // Convert start_date to timestamp
    const today = new Date().getTime(); // Get current date's timestamp
    const difference = Math.floor((today - start) / (1000 * 60 * 60 * 24)); // Difference in days
    return (difference % 21) + 1; // Cycle back to 1 after 21 days
  }

  // Reactive statement to recalculate `currentDay`
  $:{
    const calulatedDay = calculateCurrentDay($startDate);
    currentDay.set(calulatedDay);
  }
</script>

<div class="preferences-container">
  <h1>Set Your Preferences</h1>
  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}
  <form on:submit|preventDefault={submitPreferences}>
    <!-- Goal Selection -->
    <div class="form-group">
      <label for="goal">Goal</label>
      <select id="goal" bind:value={goal} required>
        <option value="" disabled>Select your goal</option>
        <option value="Build Muscle">Build Muscle</option>
        <option value="Increase Strength">Increase Strength</option>
        <option value="Fat Loss">Fat Loss</option>
      </select>
    </div>

    <!-- Split Type -->
    <div class="form-group">
      <label for="splitType">Split Type</label>
      <select id="splitType" bind:value={splitType} required>
        <option value="" disabled>Select your split type</option>
        <option value="split1-uuid-1">Classic/Bro Split</option>
        <option value="split2-uuid-2">Push Pull Legs Split</option>
        <option value="split3-uuid-3">Upper Lower Split</option>
      </select>
    </div>

    <!-- Number of Days -->
    <div class="form-group">
      <label for="numberOfDays">Number of Days</label>
      <select id="numberOfDays" bind:value={numberOfDays} required>
        <option value="" disabled>Select number of days</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
      </select>
    </div>

    <!-- Submit Button -->
    <button type="submit" >Save Preferences</button>
  </form>
</div>


<style>
/* Preferences Container */
.preferences-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background-color: #ffffff; /* White background for cards */
  border-radius: 10px; /* Rounded corners */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  font-family: Arial, sans-serif;
  color: #333333; /* Dark gray text */
}

/* Title Styling */
.preferences-container h1 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 2rem;
  color: #007bff; /* Blue for titles */
  font-weight: bold;
}

/* Error Message */
.error {
  color: #e63946; /* Red for errors */
  margin-bottom: 10px;
  font-size: 0.9rem;
  text-align: center;
  font-weight: bold;
}

/* Form Styling */
form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem; /* Spacing between form elements */
}

/* Form Group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Label Styling */
label {
  font-size: 1rem;
  font-weight: bold;
  color: #555555; /* Medium gray for labels */
}

/* Select Dropdowns */
select {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #cccccc; /* Light gray border */
  background-color: #f9f9f9; /* Light gray background */
  color: #333333; /* Dark gray text */
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

select:focus {
  outline: none;
  border-color: #007bff; /* Blue border on focus */
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.3); /* Blue glow */
}

/* Submit Button */
button[type="submit"] {
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: bold;
  color: #ffffff; /* White text */
  background-color: #4caf50; /* Green background */
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button[type="submit"]:hover {
  background-color: #388e3c; /* Darker green on hover */
}

button[type="submit"]:active {
  transform: scale(0.98); /* Slight shrink effect on click */
}

/* Responsive Design */
@media (max-width: 768px) {
  .preferences-container {
    padding: 15px;
  }

  .preferences-container h1 {
    font-size: 1.8rem;
  }

  button[type="submit"] {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
}

</style>