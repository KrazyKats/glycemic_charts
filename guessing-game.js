import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Loading in and cleaning the JSON

let motherJSON;  // JSON file for all info
let JSONlength;  // Length of JSON file to calculate random numbers
let randomMeals = [];  // All the random meals we are considering
let meal;  // Loop variable to make sure meals are unique

async function loadCSV() {
  let data;
  try {
    data = await d3.csv('website_data/glucose_spikes_patient.csv', (row) => ({
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
    randomMeals.push(meal)
}

console.log(randomMeals);


