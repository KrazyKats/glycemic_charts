// Creates Bar Plots for Stabilization
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
function bin_data(data, bins, labels, bin_by) {
  // Output an object mapping bin to average stabilize value
  function get_bin_label(value) {
    // Assume bins are sorted in descending order by amounts and no values are lower than smallest bin
    for (const [index, bin] of bins.entries()) {
      if (value >= bin) {
        return labels[index];
      }
    }
  }
  const groupedData = d3.rollup(
    data,
    (v) => d3.mean(v, (d) => -d.stabilize),
    (d) => get_bin_label(d[bin_by])
  );
  return groupedData;
}

async function loadCSVData(filePath) {
  try {
    const data = await d3.csv(filePath);
    return data;
  } catch (error) {
    console.error("Error loading CSV:", error);
    throw error;
  }
}

function createStabilizationChart(data, containerId, options) {
  // Clear existing chart
  d3.select(`#${containerId}`).selectAll("*").remove();

  // Dimensions and margins
  const margin = { top: 50, right: 150, bottom: 80, left: 80 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  // Create tooltip
  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // Create SVG
  const svg = d3
    .select(`#${containerId}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const processedData = [...data.entries()].map(([key, value]) => {
    return {
      id: key,
      carbRange: key,
      glucoseSpike: value,
    };
  });

  // Color scale - using absolute values for color intensity
  const colorScale = d3
    .scaleSequential()
    .domain([0, d3.max(processedData, (d) => Math.abs(d.glucoseSpike))])
    .interpolator(d3[options.interpolator]);

  // Scales - KEY CHANGE: Set domain to include negative values
  const xScale = d3
    .scaleBand()
    .domain(processedData.map((d) => d.carbRange))
    .range([0, width])
    .padding(0.1);

  // Updated Y scale for negative values
  const minValue = d3.min(processedData, (d) => d.glucoseSpike);
  const yScale = d3
    .scaleLinear()
    .domain([minValue * 1.1, 0]) // Start from negative value, end at 0
    .range([height, 0]); // This maps the most negative value to bottom of chart

  // Add subtitle
  svg
    .append("text")
    .attr("class", "chart-subtitle")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", 30)
    .text(options.subtitle);

  // Add X axis
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  // Add Y axis
  g.append("g").call(d3.axisLeft(yScale));

  // Add zero line for reference
  g.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", yScale(0))
    .attr("y2", yScale(0))
    .attr("stroke", "#666")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3");

  // Add X axis label
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", margin.left + width / 2)
    .attr("y", height + margin.top + 50)
    .text(options.xAxisLabel);

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + height / 2))
    .attr("y", 20)
    .text(options.yAxisLabel);

  // Add bars - KEY CHANGE: Bars now extend from zero line down to the value
  g.selectAll(".bar")
    .data(processedData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => xScale(d.carbRange))
    .attr("width", xScale.bandwidth())
    .attr("y", yScale(0)) // Start at the zero line
    .attr("height", (d) => yScale(d.glucoseSpike) - yScale(0)) // Height from zero to the value
    .attr("fill", (d) => colorScale(Math.abs(d.glucoseSpike))) // Use absolute value for color
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>${
            d.carbRange
          }g carbs</strong><br/>Glucose change: ${Math.round(
            d.glucoseSpike
          )} mg/dL`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(200).style("opacity", 0);
    });
}

function compareRanges(rangeStr) {
  // Assumes that rangeStr is a string with either a hyphen or a +.
  // Returns integer representing sorted order
  if (rangeStr.slice(-1) === "+") {
    return +rangeStr.slice(0, -1);
  }
  const splitStr = rangeStr.split("-");
  if (splitStr.length === 2) {
    return +splitStr[0];
  } else {
    throw new Error("compareRanges(): Range string could not be sorted.");
  }
}

async function createPlot(filePath) {
  // Make sure bins are sorted in descending order
  // const carbBins = [75, 50, 35, 20, 10, 0];
  // const proteinBins = [40, 25, 15, 10, 3, 0];
  // const carbLabels = ["75+", "50-75", "35-50", "20-35", "10-20", "0-10"];
  // const proteinLabels = ["40+", "25-40", "15-25", "10-15", "3-10", "0-3"];

  const carbBins = [20, 0];
  const proteinBins = [15, 0];
  const carbLabels = ["20+", "0-20"];
  const proteinLabels = ["15+", "0-15"];
  let data = await loadCSVData(filePath);
  let carbDataBinned = bin_data(data, carbBins, carbLabels, "total_carb");
  let proteinDataBinned = bin_data(data, proteinBins, proteinLabels, "protein");

  const sortedCarbBins = new Map(
    [...carbDataBinned.entries()].sort(
      ([rangeA], [rangeB]) => compareRanges(rangeA) - compareRanges(rangeB)
    )
  );
  const sortedProteinBins = new Map(
    [...proteinDataBinned.entries()].sort(
      ([rangeA], [rangeB]) => compareRanges(rangeA) - compareRanges(rangeB)
    )
  );
  const carbOptions = {
    title: "How Quickly Does Blood Sugar Stabilize with Carbohydrates?",
    subtitle:
      "Difference Between Highest Glucose Spike After Meal and Glucose Levels 2 hours after meal",
    xAxisLabel: "Carbohydrate Range (grams)",
    yAxisLabel: "Glucose Change (mg/dL)",
    interpolator: "interpolateOranges",
  };
  const proteinOptions = {
    title: "How Quickly Does Blood Sugar Stabilize with Proteins?",
    subtitle:
      "Difference Between Highest Glucose Spike After Meal and Glucose Levels 2 hours after meal",
    xAxisLabel: "Protein Range (grams)",
    yAxisLabel: "Glucose Change (mg/dL)",
    interpolator: "interpolateBlues",
  };
  createStabilizationChart(
    sortedProteinBins,
    "protein_stabilize_chart",
    proteinOptions
  );
  createStabilizationChart(sortedCarbBins, "carb_stabilize_chart", carbOptions);
}
await createPlot("viv_work/glucose_spikes.csv");
