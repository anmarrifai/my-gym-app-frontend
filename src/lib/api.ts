
import axios from "axios";

// NutritionX API Configuration
const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_FOOD_NUTRIENT_BASE_URL}`, // Base URL for NutritionX API
  headers: {
    "x-app-id": `${import.meta.env.VITE_FOOD_NUTRIENT_APP_ID}`, // Replace with your App ID
    "x-app-key": `${import.meta.env.VITE_FOOD_NUTRIENT_API_KEY}`, // Replace with your API Key
    "Content-Type": "application/json",
  },
});

/**
 * Search for food items by name.
 * @param query - The search term (e.g., "apple")
 * @returns The search results from the NutritionX API
 */
export async function searchFood(query: string) {
  try {
    const response = await apiClient.get("/search/instant", {
      params: { query }, // Query parameter for the food name
    });
    return response.data; // Return the API response
  } catch (error) {
    console.error("Error searching for food:", error);
    throw error;
  }
}

/**
 * Fetch detailed nutritional data for a specific food item.
 * @param foodItem - The name of the food item (e.g., "apple")
 * @returns The detailed nutritional information
 */
export async function getFoodNutrition(foodItem: string) {
  try {
    const response = await apiClient.post("/natural/nutrients", {
      query: foodItem, // The food item name
    });
    console.log("API Response:", response.data); // Debugging output
    return response.data; // Return the API response
  } catch (error) {
    console.error("Error fetching food nutrition:", error);
    throw error;
  }
}
