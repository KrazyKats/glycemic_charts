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

// Bind randomMeals to the buttons and update their HTML
d3.selectAll('.draggable-button')
  .data(randomMeals)
  .html((d, i) => `Meal ${i+1} |
                   Patient ID: ${motherJSON[d].ID}
                   Gender: ${motherJSON[d].Gender}
                   HbA1c Level: ${motherJSON[d].HbA1c}
                   Carb content: ${motherJSON[d].total_carb}
                   Protein content: ${motherJSON[d].protein}`); 



// Function to plot glucose traces for multiple patients/meals
async function plotGlucoseTraces(mealInfos) {
  // mealInfos: [{patientId, mealTime}, ...]
  // Load glucose readings once
  
  const glucoseData = await d3.csv('website_data/glucose_levels.csv', d => ({
    Timestamp: new Date(d.Timestamp),
    patient_id: +d.patient_id,
    glucose_value: +d.glucose_value
  }));

  let temp = mealInfos;
  mealInfos = [];

  for (let index of temp) {
    mealInfos.push({
        patientId: motherJSON[index].ID,
        mealTime: motherJSON[index].food_time
    });
  }

  // Prepare traces for each meal
  const traces = mealInfos.map(info => {
    const mealDate = new Date(info.mealTime);
    const start = new Date(mealDate.getTime() - 30 * 60 * 1000);
    const end = new Date(mealDate.getTime() + 2 * 60 * 60 * 1000);
    const trace = glucoseData.filter(d =>
      d.patient_id === info.patientId &&
      d.Timestamp >= start &&
      d.Timestamp <= end
    ).map(d => ({
      ...d,
      rel_min: (d.Timestamp - mealDate) / 60000
    }));
    return {trace, patientId: info.patientId, mealTime: info.mealTime};
  });

  // Flatten all glucose values for y-domain
  const allGlucose = traces.flatMap(t => t.trace.map(d => d.glucose_value));
  const yDomain = d3.extent(allGlucose);

  // Set up SVG
  const margin = {top: 20, right: 30, bottom: 40, left: 50};
  const width = 400 - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  d3.select('.guess-graph').selectAll('*').remove(); // Clear previous

  const svg = d3.select('.guess-graph')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleLinear()
    .domain([-30, 120])
    .range([0, width]);
  const y = d3.scaleLinear()
    .domain(yDomain).nice()
    .range([height, 0]);

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d} min`));
  svg.append('g')
    .call(d3.axisLeft(y));

  // Color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Plot each trace
  traces.forEach((t, i) => {
    const line = d3.line()
      .x(d => x(d.rel_min))
      .y(d => y(d.glucose_value));

    svg.append('path')
      .datum(t.trace)
      .attr('fill', 'none')
      .attr('stroke', color(i))
      .attr('stroke-width', 2)
      .attr('d', line);

    // Optional: add label at end of line
    if (t.trace.length > 0) {
      svg.append('text')
        .attr('x', x(t.trace[t.trace.length - 1].rel_min) + 5)
        .attr('y', y(t.trace[t.trace.length - 1].glucose_value))
        .attr('fill', color(i))
        .attr('font-size', 12)
        .text(`Patient ${t.patientId}`);
    }
  });

  // Labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -8)
    .attr('text-anchor', 'middle')
    .text('Glucose Trace');
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 35)
    .attr('text-anchor', 'middle')
    .text('Minutes relative to meal');
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -35)
    .attr('text-anchor', 'middle')
    .text('Glucose (mg/dL)');
}

// Example usage:
// plotGlucoseTraces([
//   {patientId: 1, mealTime: '2020-02-13 18:00:00'},
//   {patientId: 2, mealTime: '2020-02-14 12:00:00'},
//   {patientId: 3, mealTime: '2020-02-15 08:00:00'}
// ]);

plotGlucoseTraces(randomMeals)
