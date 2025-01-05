<script lang="ts">
  import { onMount } from "svelte";
  import { Chart } from "chart.js"; // to make the ring chart 
  import type { LoggedFood } from "$lib/types/loggedFood";
  import { Preferences } from "@capacitor/preferences"; // to get the caloric needs 

  // the type of logged food and caloric needs
  export let dailyLog: LoggedFood[] = [];
  let caloricNeeds: { dailyCalories: number; protein: number; carbs: number; fats: number } | null = null;

  let calorieChartRef: Chart | null = null;


  //get caloric needs from local storage
  async function fetchCaloricNeeds() {
    const { value } = await Preferences.get({ key: "calorieData" });
    if (value) {
      caloricNeeds = JSON.parse(value);
    }
  }

  //get the info for the macros and calculate the fill 
  function calculateTotal(key: keyof typeof dailyLog[0]): number {
    return dailyLog.reduce((total, item) => total + Number(item[key]), 0);
  }

  function calculatePercentage(logged: number, target: number): number {
    return Math.min((logged / target) * 100, 100);
  }


  // create the ring chart from the library 
  function createCharts() {
    const totalCalories = calculateTotal("calories");
    const neededCalories = caloricNeeds?.dailyCalories || 0;
    const percentage = ((totalCalories / neededCalories) * 100).toFixed(1);

    const calorieCanvas = document.getElementById("calorieChart") as HTMLCanvasElement | null;
    if (calorieChartRef) calorieChartRef.destroy();
    if (calorieCanvas) {
      calorieChartRef = new Chart(calorieCanvas, {
        type: "doughnut",
        data: {
          labels: ["Logged", "Remaining"],
          datasets: [
            {
              data: [totalCalories, Math.max(neededCalories - totalCalories, 0)],
              backgroundColor: ["#08FF08", "#90a4ae"], // Green and Gray-Blue
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "75%",
          plugins: {
            legend: { display: false },
          },
        },
        plugins: [
          {
            id: "center-text",
            beforeDraw: (chart) => {
              const ctx = chart.ctx;
              const { width } = chart;
              const { height } = chart;
              const text = `${percentage}%`;
              ctx.save();
              ctx.font = "bold 20px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#2c3e50";
              ctx.fillText(text, width / 2, height / 2);
              ctx.restore();
            },
          },
        ],
      });
    }
  }

  // making the chart reactive
  $: if (caloricNeeds && dailyLog) {
    createCharts();
  }

  onMount(() => {
    fetchCaloricNeeds();
    createCharts();
  });
</script>

<div class="summary-section">
  <div class="ring-chart-container">
    <canvas id="calorieChart"></canvas>
    <div class="calorie-values">
      {calculateTotal("calories")}/{caloricNeeds?.dailyCalories || 0} kcal
    </div>
  </div>
  <div class="progress-bars-container">
    {#if caloricNeeds}
      {#each (["protein", "carbs", "fats"] as ("protein" | "carbs" | "fats")[]) as macro}
        <div class="progress-bar-container">
          <span class="progress-label">{macro.charAt(0).toUpperCase() + macro.slice(1)}</span>
          <div class="progress-bar {macro}">
            <div
              class="progress-bar-fill"
              style="height: {calculatePercentage(calculateTotal(macro), caloricNeeds[macro])}%;"
            ></div>
          </div>
          <span class="progress-value">
            {Math.round(calculateTotal(macro))}g / {Math.round(caloricNeeds[macro])}g
          </span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .summary-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem; 
    padding: 1rem;
    background: linear-gradient(135deg, #ffffff, #f9f9f9); 
    border-radius: 16px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .ring-chart-container {
    position: relative;
    width: 180px; 
    height: 180px;
    text-align: center;
  }

  .calorie-values {
    margin-top: 1rem; 
    font-size: 1.2rem;
    font-weight: bold;
    color: #333333;
  }

  .progress-bars-container {
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-top: 1rem; 
  }

  .progress-bar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .progress-bar {
    position: relative;
    width: 30px; 
    height: 90px; 
    background-color: #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .progress-bar-fill {
    position: absolute;
    bottom: 0;
    width: 100%;
    border-radius: 8px 8px 0 0;
    transition: height 0.3s ease;
  }

  .progress-bar.protein .progress-bar-fill {
    background: linear-gradient(180deg,#59CBE8, #64b5f6);
  }

  .progress-bar.carbs .progress-bar-fill {
    background: linear-gradient(180deg, #ccff00, #fff59d);
  }

  .progress-bar.fats .progress-bar-fill {
    background: linear-gradient(180deg, #f44336, #ef9a9a);
  }

  .progress-label {
    font-size: 0.9rem;
    font-weight: bold;
    color: #666666;
    margin-bottom: 0.3rem;
  }

  .progress-value {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    font-weight: bold;
    color: #333333;
  }
</style>
