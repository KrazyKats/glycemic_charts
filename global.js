import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let motherJSON;
let carbJSON;
let proteinJSON;

async function loadCSV() {
  let data;
  try {
    data = await d3.csv('website_data/glucose_spikes_patient.csv', (row) => ({
    ...row,
    food_time: new Date(row.food_time), 
    highest_glucose: Number(row.highest_glucose),
    pre_meal_glucose: Number(row.pre_meal_glucose),
  }));
  } catch (error) {
    console.error("Failed to load CSV:", error);
  }

  return data;
  
}

motherJSON = await loadCSV();
console.log(motherJSON)