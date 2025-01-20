
import axios from "axios";

// NutritionX API Configuration
const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_FOOD_NUTRIENT_BASE_URL}`,
  headers: {
    "x-app-id": `${import.meta.env.VITE_FOOD_NUTRIENT_APP_ID}`, 
    "x-app-key": `${import.meta.env.VITE_FOOD_NUTRIENT_API_KEY}`, 
    "Content-Type": "application/json",
  },
});




export async function searchFood(query: string) {
  try {
    const response = await apiClient.get("/search/instant", {
      params: { query }, //  parameter for the food name
    });
    return response.data; // response 
  } catch (error) {
    console.error("Error searching for food:", error);
    throw error;
  }
}


export async function getFoodNutrition(foodItem: string) {
  try {
    const response = await apiClient.post("/natural/nutrients", {
      query: foodItem, // The food item name
    });
    console.log("API Response:", response.data); 
    return response.data; 
  } catch (error) {
    console.error("Error fetching food nutrition:", error);
    throw error;
  }
}
