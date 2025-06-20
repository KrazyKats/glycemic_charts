// main.js

/** AND PLOTS **/

// Renders a bar chart for the specified nutrient bin and glucose spike values
function drawBarChart(data, groupKey, valueKey, selector) {
  // Group data by bin and compute average glucose spike per bin
  const groupedMap = d3.rollup(
    data,
    (v) => ({
      avg: d3.mean(v, (d) => d[valueKey]),
      count: v.length,
    }),
    (d) => d[groupKey]
  );

  const groupedData = Array.from(groupedMap, ([key, value]) => ({
    key,
    value: value.avg,
    count: value.count,
  }));

  // Chart container specs
  const width = 500;
  const height = 250;
  const margin = { top: 80, right: 30, bottom: 40, left: 60 };

  const svg = d3
    .select(selector)
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Order bins explicitly to ensure correct order
  const x = d3
    .scaleBand()
    .domain(
      groupKey === "carb_bin"
        ? [
            "[0.0, 10.0)",
            "[10.0, 20.0)",
            "[20.0, 35.0)",
            "[35.0, 50.0)",
            "[50.0, 75.0)",
            "[75.0, inf)",
          ]
        : ["0-3g", "3-8g", "8-15g", "15-25g", "25-40g", "40+g"]
    )
    .range([0, width])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(groupedData, (d) => d.value)])
    .nice()
    .range([height, 0]);

  // X-axis (with cleanup for protein bin labels)
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(x).tickFormat((d) => {
        return groupKey === "protein_bin" ? d.replace("g", "") : d;
      })
    );

  // Y-axis
  svg.append("g").call(d3.axisLeft(y));

  // Y-axis label
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${-40}, ${height / 2}) rotate(-90)`)
    .text("Average Glucose Spike (mg/dL)");

  // X-axis label
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 35)
    .text(groupKey === "carb_bin" ? "Carbohydrate Bin (g)" : "Protein Bin (g)");

  // Chart Title (inside SVG)
  svg
    .append("text")
    .attr("class", "chart-subtitle")
    .attr("x", width / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text(
      groupKey === "carb_bin"
        ? "Post-Meal Glucose Spikes by Carbohydrate Content in Meal"
        : "Post-Meal Glucose Spikes by Protein Content in Meal"
    );

  // Bars (color comes from style.css, interactivity from JS)
  svg
    .selectAll(".bar")
    .data(groupedData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.key))
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => height - y(d.value))
    .on("mouseover", function (event, d) {
      d3.select(this)
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("fill-opacity", 1);

      d3
        .select("#bar-tooltip")
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px").html(`
        <strong>${
          groupKey === "carb_bin" ? "Carbohydrate Bin" : "Protein Bin"
        }:</strong> ${d.key}<br>
        <strong>Avg Spike:</strong> ${d.value.toFixed(1)} mg/dL<br>
        <strong>Meal Count:</strong> ${d.count}
      `);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "none").attr("fill-opacity", 0.9);

      d3.select("#bar-tooltip").style("opacity", 0);
    });
}

// Load data and draw charts
d3.csv("website_data/glucose_spikes.csv", d3.autoType).then((data) => {
  drawBarChart(data, "carb_bin", "glucose_spike", "#and-carb-chart");
  drawBarChart(data, "protein_bin", "glucose_spike", "#and-protein-chart");
});
