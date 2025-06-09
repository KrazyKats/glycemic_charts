import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Loading in and cleaning the JSON

let motherJSON; // JSON file for all info
let JSONlength; // Length of JSON file to calculate random numbers
let randomMeals = []; // All the random meals we are considering
let meal; // Loop variable to make sure meals are unique
let highestSpike; // Meal number corresponding to highest spike

async function loadCSV() {
  let data;
  try {
    data = await d3.csv("website_data/glucose_spikes_patient.csv", (row) => ({
      ...row,
      food_time: new Date(row.food_time),
      patient_id: new Number(row.patient_id),
      highest_glucose: Number(row.highest_glucose),
      pre_meal_glucose: Number(row.pre_meal_glucose),
      mean_glucose_well_after: Number(row.mean_glucose_well_after),
      calorie: Number(row.calorie),
      total_carb: Number(row.total_carb),
      dietary_fiber: Number(row.dietary_fiber),
      sugar: Number(row.sugar),
      protein: Number(row.protein),
      total_fat: Number(row.total_fat),
      glucose_spike: Number(row.glucose_spike),
      HbA1c: Number(row.HbA1c),
      ID: Number(row.ID),
    }));
  } catch (error) {
    console.error("Failed to load CSV:", error);
  }

  return data;
}

// For getting random ppl
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

motherJSON = await loadCSV();
JSONlength = motherJSON.length;

// Get 3 unique meals
while (randomMeals.length !== 3) {
  meal = getRandomInt(0, JSONlength);
  if (randomMeals.includes(meal)) {
    continue;
  }
  randomMeals.push(meal);
}

highestSpike = {};
for (let i = 0; i < randomMeals.length; i++) {
  highestSpike[`meal ${i + 1}`] = motherJSON[randomMeals[i]].glucose_spike;
}
console.log(highestSpike);
let maxKey = Object.keys(highestSpike).reduce((a, b) =>
  highestSpike[a] > highestSpike[b] ? a : b
);
console.log(maxKey);

// Bind randomMeals to the buttons and update their HTML
d3.selectAll(".option")
  .data(randomMeals)
  .html(
    (d, i) => `Meal ${i + 1} |
                   Carb content: ${motherJSON[d].total_carb.toFixed(2)}
                   Protein content: ${motherJSON[d].protein.toFixed(2)}`
  );

document.querySelectorAll(".option").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".option")
      .forEach((b) => b.classList.remove("selected"));
    this.classList.add("selected");
  });
});

// Function to plot glucose traces for multiple patients/meals
async function plotGlucoseTraces(mealInfos) {
  // mealInfos: [{patientId, mealTime}, ...] this is cap
  // Load glucose readings once

  const glucoseData = await d3.csv("website_data/glucose_levels.csv", (d) => ({
    Timestamp: new Date(d.Timestamp),
    patient_id: +d.patient_id,
    glucose_value: +d.glucose_value,
  }));

  let temp = mealInfos;
  mealInfos = [];

  for (let index of temp) {
    mealInfos.push({
      patientId: motherJSON[index].ID,
      mealTime: motherJSON[index].food_time,
    });
  }

  // Prepare traces for each meal
  const traces = mealInfos.map((info) => {
    const mealDate = new Date(info.mealTime);
    const start = new Date(mealDate.getTime() - 30 * 60 * 1000);
    const end = new Date(mealDate.getTime() + 2 * 60 * 60 * 1000);
    const trace = glucoseData
      .filter(
        (d) =>
          d.patient_id === info.patientId &&
          d.Timestamp >= start &&
          d.Timestamp <= end
      )
      .map((d) => ({
        ...d,
        rel_min: (d.Timestamp - mealDate) / 60000,
      }));

    // Find the glucose value at time 0 (or closest to 0)
    let baseline = null;
    if (trace.length > 0) {
      // Find the point closest to rel_min === 0
      baseline = trace.reduce((prev, curr) =>
        Math.abs(curr.rel_min) < Math.abs(prev.rel_min) ? curr : prev
      ).glucose_value;
      // Shift all values so that value at 0 min is 0
      trace.forEach((d) => {
        d.glucose_value = d.glucose_value - baseline;
      });
    }

    return { trace, patientId: info.patientId, mealTime: info.mealTime };
  });

  // Flatten all glucose values for y-domain
  const allGlucose = traces.flatMap((t) => t.trace.map((d) => d.glucose_value));
  const yDomain = d3.extent(allGlucose);

  // Set up SVG
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  d3.select(".guess-graph").selectAll("*").remove(); // Clear previous

  const svg = d3
    .select(".guess-graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleLinear().domain([-30, 120]).range([0, width]);
  const y = d3.scaleLinear().domain(yDomain).nice().range([height, 0]);

  // Axes
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(6)
        .tickFormat((d) => `${d} min`)
    );
  svg.append("g").call(d3.axisLeft(y));

  // Dotted line
  svg
    .append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,4"); // Dotted line

  // Color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Plot each trace
  traces.forEach((t, i) => {
    const line = d3
      .line()
      .x((d) => x(d.rel_min))
      .y((d) => y(d.glucose_value));

    svg
      .append("path")
      .datum(t.trace)
      .attr("fill", "none")
      .attr("stroke", color(i))
      .attr("stroke-width", 2)
      .attr("d", line);
  });

  // After you have your traces array
  // After you have your traces array
  let maxSpike = -Infinity;
  let maxMealIndex = -1;
  let mealMaxes = [];

  traces.forEach((t, i) => {
    // Get all glucose differences after 0 minutes
    const postMeal = t.trace.filter((d) => d.rel_min > 0);
    if (postMeal.length > 0) {
      const max = Math.max(...postMeal.map((d) => d.glucose_value));

      mealMaxes.push(max);
      if (max > maxSpike) {
        maxSpike = max;
        maxMealIndex = i; // 0-based index: 0 for meal 1, 1 for meal 2, etc.
      }
    }
  });

  // --- Legend ---
  d3.select(".guess-legend").selectAll("*").remove(); // Clear previous legend

  const legendEntryWidth = 300;
  const legendEntryHeight = 24;

  const legendSvg = d3
    .select(".guess-legend")
    .append("svg")
    .attr("width", traces.length * legendEntryWidth)
    .attr("height", legendEntryHeight);

  const legend = legendSvg
    .selectAll(".legend-item")
    .data(traces)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(${i * legendEntryWidth + 10}, 2)`);

  legend
    .append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("y", 0)
    .attr("fill", (d, i) => color(i));

  legend
    .append("text")
    .attr("x", 30)
    .attr("y", 15) // Vertically center text with the rect
    .attr("font-size", 14)
    .text(
      (d, i) => `Meal ${i + 1}, Max Glucose Spike: ${mealMaxes[i].toFixed(2)}`
    );
  // Labels
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .text("Who had the Highest Glucose Difference?");
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 35)
    .attr("text-anchor", "middle")
    .text("Minutes relative to meal");
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .text("Glucose Difference from Meal Start (mg/dL)");

  // To return the corresponding meal number (1, 2, or 3)
  return maxMealIndex + 1;
}

// Example usage:
// plotGlucoseTraces([
//   {patientId: 1, mealTime: '2020-02-13 18:00:00'},
//   {patientId: 2, mealTime: '2020-02-14 12:00:00'},
//   {patientId: 3, mealTime: '2020-02-15 08:00:00'}
// ]);

// plotGlucoseTraces(randomMeals)
// document.getElementById('item4').addEventListener('click', function() {
//   const selected = document.querySelector('.option.selected');
//   if (selected) {
//     // Call plotGlucoseTraces with only the selected meal
//     plotGlucoseTraces(randomMeals);
//   } else {
//     alert('Please select a meal option before confirming.');
//   }
// });

document.getElementById("item4").addEventListener("click", async function () {
  const selected = document.querySelector(".option.selected");
  if (selected) {
    // Find the index of the selected button (0, 1, or 2)
    const selectedIndex = Array.from(
      document.querySelectorAll(".option")
    ).indexOf(selected);

    // Call plotGlucoseTraces with only the selected meal
    let max_meal = await plotGlucoseTraces(randomMeals);
    console.log(max_meal);

    // Check if selected button matches maxKey
    const selectedMealKey = `meal ${selectedIndex + 1}`;
    if (selectedIndex + 1 === max_meal) {
      // Correct selection
      alert("Correct! You picked the meal with the highest glucose spike.");
    } else {
      // Incorrect selection
      alert("Incorrect. Try again!");
    }
  } else {
    alert("Please select a meal option before confirming.");
  }
});

document.getElementById("item5").addEventListener("click", function () {
  randomMeals = [];

  // Get 3 unique meals
  while (randomMeals.length !== 3) {
    meal = getRandomInt(0, JSONlength);
    if (randomMeals.includes(meal)) {
      continue;
    }
    randomMeals.push(meal);
  }

  highestSpike = {};
  for (let i = 0; i < randomMeals.length; i++) {
    highestSpike[`meal ${i + 1}`] = motherJSON[randomMeals[i]].glucose_spike;
  }

  // Bind randomMeals to the buttons and update their HTML
  d3.selectAll(".option")
    .data(randomMeals)
    .html(
      (d, i) => `Meal ${i + 1} |
                    Carb content: ${motherJSON[d].total_carb.toFixed(2)}
                    Protein content: ${motherJSON[d].protein.toFixed(2)}`
    );

  d3.select(".guess-graph").selectAll("*").remove();
  d3.select(".guess-legend").selectAll("*").remove();
});
