// Chart dimensions
const margin = { top: 20, right: 240, bottom: 60, left: 70 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

let rawData = [];
let carbPercentiles = [];
let fatPercentiles = [];

// Get slider elements
const carbSlider = document.getElementById("carbSlider");
const fatSlider = document.getElementById("fatSlider");
const carbValue = document.getElementById("carbValue");
const fatValue = document.getElementById("fatValue");
const carbMealCount = document.getElementById("carbMealCount");
const fatMealCount = document.getElementById("fatMealCount");

// Update display values and chart when sliders change
carbSlider.addEventListener("input", function () {
  const percentile = parseInt(this.value);
  const actualValue = getValueAtPercentile(carbPercentiles, percentile);
  carbValue.textContent = `${percentile}% (${actualValue.toFixed(1)}g)`;
  updateChart();
});

fatSlider.addEventListener("input", function () {
  const percentile = parseInt(this.value);
  const actualValue = getValueAtPercentile(fatPercentiles, percentile);
  fatValue.textContent = `${percentile}% (${actualValue.toFixed(1)}g)`;
  updateChart();
});

function calculatePercentiles(data, field) {
  const values = data.map(d => d[field]).sort((a, b) => a - b);
  const percentiles = [];
  
  for (let p = 0; p <= 100; p++) {
    const index = (p / 100) * (values.length - 1);
    if (index === Math.floor(index)) {
      percentiles[p] = values[index];
    } else {
      const lower = values[Math.floor(index)];
      const upper = values[Math.ceil(index)];
      percentiles[p] = lower + (upper - lower) * (index - Math.floor(index));
    }
  }
  
  return percentiles;
}

function getValueAtPercentile(percentiles, percentile) {
  return percentiles[percentile] || 0;
}

function aggregateData(data, timeInterval = 5) {
  // Group data by time_after_meal_minutes (rounded to nearest interval)
  const grouped = d3.group(
    data,
    (d) => Math.round(d.time_after_meal_minutes / timeInterval) * timeInterval
  );

  const aggregatedData = [];

  grouped.forEach((timePoints, timeAfterMeal) => {
    const meanGlucoseDiff = d3.mean(timePoints, (d) => d.glucose_diff);
    const meanGlucose = d3.mean(timePoints, (d) => d.glucose);
    const meanPreMealGlucose = d3.mean(timePoints, (d) => d.pre_meal_glucose);

    aggregatedData.push({
      time_after_meal_minutes: timeAfterMeal,
      glucose_diff: meanGlucoseDiff,
      glucose: meanGlucose,
      pre_meal_glucose: meanPreMealGlucose,
      count: timePoints.length,
    });
  });

  return aggregatedData.sort(
    (a, b) => a.time_after_meal_minutes - b.time_after_meal_minutes
  );
}

function filterData(data, carbPercentile, fatPercentile) {
  const minCarb = getValueAtPercentile(carbPercentiles, carbPercentile);
  const minFat = getValueAtPercentile(fatPercentiles, fatPercentile);
  
  // Filter for high carb meals (excluding those that are also high protein)
  const carbData = data.filter((d) => d.total_carb >= minCarb && d.protein < minFat);
  
  // Filter for high protein meals (excluding those that are also high carb)
  const fatData = data.filter((d) => d.protein >= minFat && d.total_carb < minCarb);

  return {
    carbData: aggregateData(carbData),
    fatData: aggregateData(fatData),
    carbMealCount: new Set(carbData.map((d) => d.food_time)).size,
    fatMealCount: new Set(fatData.map((d) => d.food_time)).size,
  };
}

let currentScales = { xScale: null, yScale: null };
let svg, g, tooltip;

function initializeChart() {
  // Create SVG only once
  svg = d3
    .select("#chart_fat_carb")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create tooltip only once
  tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Initialize static elements
  g.append("g").attr("class", "grid x-grid");
  g.append("g").attr("class", "grid y-grid");
  g.append("line").attr("class", "zero-line");
  g.append("line").attr("class", "meal-marker");
  g.append("text").attr("class", "meal-text");
  g.append("g").attr("class", "axis x-axis");
  g.append("g").attr("class", "axis y-axis");
  g.append("text").attr("class", "axis-label y-label");
  g.append("text").attr("class", "axis-label x-label");
  g.append("g").attr("class", "legend");
}

function createChart(carbData, fatData) {
  if (!svg) initializeChart();

  if (carbData.length === 0 && fatData.length === 0) {
    d3.select("#chart_fat_carb").html(`
            <div class="error-message">
                <h3>No data matches current filters</h3>
                <p>Try lowering the minimum carbohydrate or protein thresholds</p>
            </div>
        `);
    return;
  }

  // Combine data to get proper scales
  const allData = [...carbData, ...fatData];

  // Create scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(allData, (d) => d.time_after_meal_minutes))
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(allData, (d) => d.glucose_diff))
    .nice()
    .range([height, 0]);

  // Store current scales for animations
  currentScales = { xScale, yScale };

  // Animation duration
  const duration = 800;

  // Update grid with animation
  g.select(".x-grid")
    .attr("transform", `translate(0,${height})`)
    .transition()
    .duration(duration)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""));

  g.select(".y-grid")
    .transition()
    .duration(duration)
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

  // Update zero line with animation
  g.select(".zero-line")
    .transition()
    .duration(duration)
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", yScale(0))
    .attr("y2", yScale(0));

  // Update meal time marker with animation
  g.select(".meal-marker")
    .transition()
    .duration(duration)
    .attr("x1", xScale(0))
    .attr("x2", xScale(0))
    .attr("y1", 0)
    .attr("y2", height);

  g.select(".meal-text")
    .transition()
    .duration(duration)
    .attr("x", xScale(0))
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#e74c3c")
    .style("font-weight", "bold")
    .text("Meal Time");

  // Line generator
  const line = d3
    .line()
    .x((d) => xScale(d.time_after_meal_minutes))
    .y((d) => yScale(d.glucose_diff))
    .curve(d3.curveMonotoneX);

  // Animate carb line and points
  const carbLine = g
    .selectAll(".carb-line")
    .data(carbData.length > 0 ? [carbData] : []);

  carbLine
    .enter()
    .append("path")
    .attr("class", "line carb-line")
    .style("opacity", 0)
    .merge(carbLine)
    .transition()
    .duration(duration)
    .style("opacity", 1)
    .attr("d", line);

  carbLine.exit().transition().duration(duration).style("opacity", 0).remove();

  // Animate carb dots
  const carbDots = g
    .selectAll(".carb-dot")
    .data(carbData, (d) => d.time_after_meal_minutes);

  carbDots
    .enter()
    .append("circle")
    .attr("class", "dot carb-dot")
    .attr("r", 3)
    .attr("cx", (d) => xScale(d.time_after_meal_minutes))
    .attr("cy", (d) => yScale(d.glucose_diff))
    .style("opacity", 0)
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `
                <strong>High Carb Only Meals</strong><br/>
                Time: ${Math.round(d.time_after_meal_minutes)} min<br/>
                Glucose Diff: ${
                  d.glucose_diff > 0 ? "+" : ""
                }${d.glucose_diff.toFixed(1)} mg/dL<br/>
                Current: ${d.glucose.toFixed(1)} mg/dL<br/>
                Pre-meal: ${d.pre_meal_glucose.toFixed(1)} mg/dL<br/>
                Data points: ${d.count}
            `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .transition()
    .duration(duration)
    .delay((d, i) => i * 50)
    .attr("r", 4)
    .style("opacity", 1);

  carbDots
    .transition()
    .duration(duration)
    .attr("cx", (d) => xScale(d.time_after_meal_minutes))
    .attr("cy", (d) => yScale(d.glucose_diff));

  carbDots
    .exit()
    .transition()
    .duration(duration)
    .attr("r", 0)
    .style("opacity", 0)
    .remove();

  // Animate fat line and points
  const fatLine = g
    .selectAll(".fat-line")
    .data(fatData.length > 0 ? [fatData] : []);

  fatLine
    .enter()
    .append("path")
    .attr("class", "line fat-line")
    .style("opacity", 0)
    .merge(fatLine)
    .transition()
    .duration(duration)
    .style("opacity", 1)
    .attr("d", line);

  fatLine.exit().transition().duration(duration).style("opacity", 0).remove();

  // Animate fat dots
  const fatDots = g
    .selectAll(".fat-dot")
    .data(fatData, (d) => d.time_after_meal_minutes);

  fatDots
    .enter()
    .append("circle")
    .attr("class", "dot fat-dot")
    .attr("r", 0)
    .attr("cx", (d) => xScale(d.time_after_meal_minutes))
    .attr("cy", (d) => yScale(d.glucose_diff))
    .style("opacity", 0)
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `
                <strong>High Protein Only Meals</strong><br/>
                Time: ${Math.round(d.time_after_meal_minutes)} min<br/>
                Glucose Diff: ${
                  d.glucose_diff > 0 ? "+" : ""
                }${d.glucose_diff.toFixed(1)} mg/dL<br/>
                Current: ${d.glucose.toFixed(1)} mg/dL<br/>
                Pre-meal: ${d.pre_meal_glucose.toFixed(1)} mg/dL<br/>
                Data points: ${d.count}
            `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .transition()
    .duration(duration)
    .delay((d, i) => i * 50)
    .attr("r", 4)
    .style("opacity", 1);

  fatDots
    .transition()
    .duration(duration)
    .attr("cx", (d) => xScale(d.time_after_meal_minutes))
    .attr("cy", (d) => yScale(d.glucose_diff));

  fatDots
    .exit()
    .transition()
    .duration(duration)
    .attr("r", 0)
    .style("opacity", 0)
    .remove();

  // Update axes with animation
  g.select(".x-axis")
    .attr("transform", `translate(0,${height})`)
    .transition()
    .duration(duration)
    .call(d3.axisBottom(xScale));

  g.select(".y-axis").transition().duration(duration).call(d3.axisLeft(yScale));

  // Update axis labels
  g.select(".y-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Glucose Difference from Pre-meal (mg/dL)");

  g.select(".x-label")
    .attr(
      "transform",
      `translate(${width / 2}, ${height + margin.bottom - 10})`
    )
    .style("text-anchor", "middle")
    .text("Time After Meal (minutes)");

  // Update legend with animation
  const legendData = [];
  if (carbData.length > 0) {
    const carbPercentile = parseInt(carbSlider.value);
    const carbActualValue = getValueAtPercentile(carbPercentiles, carbPercentile);
    legendData.push({
      label: `High Carb Only (≥${carbPercentile}% / ${carbActualValue.toFixed(1)}g)`,
      color: "#e74c3c",
    });
  }
  if (fatData.length > 0) {
    const fatPercentile = parseInt(fatSlider.value);
    const fatActualValue = getValueAtPercentile(fatPercentiles, fatPercentile);
    legendData.push({
      label: `High Protein Only (≥${fatPercentile}% / ${fatActualValue.toFixed(1)}g)`,
      color: "#3498db",
    });
  }

  const legend = g
    .select(".legend")
    .attr("transform", `translate(${width + 10}, 40)`);

  const legendItems = legend
    .selectAll(".legend-item")
    .data(legendData, (d) => d.label);

  const legendEnter = legendItems
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .style("opacity", 0);

  legendEnter
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 0)
    .attr("y2", 0)
    .style("stroke-width", 3);

  legendEnter
    .append("circle")
    .attr("cx", 10)
    .attr("cy", 0)
    .attr("r", 4)
    .style("stroke", "white")
    .style("stroke-width", 2);

  legendEnter
    .append("text")
    .attr("x", 30)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .style("font-size", "13px");

  const legendUpdate = legendEnter.merge(legendItems);

  legendUpdate
    .transition()
    .duration(duration)
    .style("opacity", 1)
    .attr("transform", (d, i) => `translate(0, ${i * 25})`);

  legendUpdate
    .select("line")
    .transition()
    .duration(duration)
    .style("stroke", (d) => d.color);

  legendUpdate
    .select("circle")
    .transition()
    .duration(duration)
    .style("fill", (d) => d.color);

  legendUpdate
    .select("text")
    .transition()
    .duration(duration)
    .text((d) => d.label);

  legendItems
    .exit()
    .transition()
    .duration(duration)
    .style("opacity", 0)
    .remove();
}

function animateNumber(element, from, to, duration = 500) {
  const start = Date.now();
  const animate = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.round(from + (to - from) * progress);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  animate();
}

function updateChart() {
  const carbPercentile = parseInt(carbSlider.value);
  const fatPercentile = parseInt(fatSlider.value);

  const filtered = filterData(rawData, carbPercentile, fatPercentile);

  // Animate meal counts
  const currentCarbCount = parseInt(carbMealCount.textContent) || 0;
  const currentFatCount = parseInt(fatMealCount.textContent) || 0;

  animateNumber(carbMealCount, currentCarbCount, filtered.carbMealCount);
  animateNumber(fatMealCount, currentFatCount, filtered.fatMealCount);

  createChart(filtered.carbData, filtered.fatData);
}

async function loadData() {
  try {
    const data = await d3.csv("./website_data/line_plot_differences.csv");

    // Process the data
    data.forEach((d) => {
      d.patient_id = +d.patient_id;
      d.glucose = +d.glucose;
      d.time_after_meal = +d.time_after_meal;
      d.time_after_meal_minutes = d.time_after_meal / 60;
      d.pre_meal_glucose = +d.pre_meal_glucose;
      d.glucose_diff = +d.glucose_diff;
      d.total_carb = +d.total_carb;
      d.protein = +d.protein;
    });
    rawData = data;

    // Calculate percentiles for both carbs and protein
    carbPercentiles = calculatePercentiles(data, 'total_carb');
    fatPercentiles = calculatePercentiles(data, 'protein');

    // Set slider ranges to percentiles (0-100)
    carbSlider.min = 50;
    carbSlider.max = 100;
    carbSlider.value = 50; // Start at median
    
    fatSlider.min = 50;
    fatSlider.max = 100;
    fatSlider.value = 50; // Start at median

    // Initialize display values
    const initialCarbValue = getValueAtPercentile(carbPercentiles, 50);
    const initialFatValue = getValueAtPercentile(fatPercentiles, 50);
    carbValue.textContent = `50% (${initialCarbValue.toFixed(1)}g)`;
    fatValue.textContent = `50% (${initialFatValue.toFixed(1)}g)`;

    updateChart();
  } catch (error) {
    console.error("Error loading CSV file:", error);
    d3.select("#chart_fat_carb").html(`
            <div class="error-message">
                <h3>Error loading data file</h3>
                <p>Could not load './website_data/line_plot_differences.csv'</p>
                <p>Please check that the file exists in the correct location.</p>
            </div>
        `);
  }
}

// Load data when page loads
await loadData();