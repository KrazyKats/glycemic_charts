// intro.js

/** INTRO TIME SERIES PLOT **/
d3.json("website_data/glucose_carb_vs_protein.json").then(data => {
  const highCarb = data.high_carb;
  const highProtein = data.high_protein;

  drawGlucoseLines(highCarb, highProtein);
});

function drawGlucoseLines(highCarb, highProtein) {
  const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width = 700 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#intro-viz")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([-30, 120]).range([0, width]);
  const y = d3.scaleLinear()
    .domain([
      d3.min(highCarb.concat(highProtein), d => d.glucose) - 10,
      d3.max(highCarb.concat(highProtein), d => d.glucose) + 10
    ])
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.minutes))
    .y(d => y(d.glucose))
    .curve(d3.curveMonotoneX);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10));

  svg.append("g").call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "13px")
    .text("Minutes After Meal");

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${-40}, ${height / 2}) rotate(-90)`)
    .style("font-size", "13px")
    .text("Blood Glucose Levels (mg/dL)");

  const pathHighCarb = svg.append("path")
    .datum(highCarb)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 4.5)
    .attr("d", line);

  const pathHighProtein = svg.append("path")
    .datum(highProtein)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 4.5)
    .attr("d", line);

  animatePath(pathHighCarb, 2500);
  animatePath(pathHighProtein, 2500);

  svg.append("line")
    .attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", "#999")
    .attr("stroke-dasharray", "4");

  svg.append("text")
    .attr("x", x(0))
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .text("Meal Time")
    .style("font-size", "12px")
    .style("fill", "#666");

  d3.select("#replay-button").on("click", () => {
    animatePath(pathHighCarb, 2500);
    animatePath(pathHighProtein, 2500);
  });

  // === Tooltip interaction per line ===
  const tooltip = d3.select("#intro-tooltip");
  const bisect = d3.bisector(d => d.minutes).left;

  function attachTooltip(path, data, color, label) {
    path
      .on("mousemove", function(event) {
        const [mouseX] = d3.pointer(event);
        const time = x.invert(mouseX);
        const i = bisect(data, time);
        const point = data[i] || data[data.length - 1];

        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px")
          .html(`
            <strong style="color:${color}">${label}</strong><br>
            Time: ${Math.round(point.minutes)} min<br>
            Glucose: ${Math.round(point.glucose)} mg/dL
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  attachTooltip(pathHighCarb, highCarb, "red", "High Carb: Cinnamon Rolls");
  attachTooltip(pathHighProtein, highProtein, "steelblue", "High Protein: Turkey Wings");
}

function animatePath(path, duration = 2500) {
  const totalLength = path.node().getTotalLength();

  path
    .interrupt()
    .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr("stroke-dashoffset", 0);
}
