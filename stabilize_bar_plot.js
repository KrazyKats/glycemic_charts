/* Function one -- parse_csv(): takes in a CSV file and returns the data needed as an object
I can allow filtering for this function if I want to
Perhaps have optional parameters for the bins of carbs, proteins, etc.
By default, use the bins that I'm currently using

Function two -- create_bar_plot(): Uses d3 to create the bar plots for proteins and carbs
I can share mos t of the logic of these two functions
 */
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
function bin_data(data, bins, labels, bin_by) {
  // Output an object mapping bin to average stabilize value
  // In order to compute the average by category, I can compute a sum and a count
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
    (v) => d3.mean(v, (d) => d.stabilize),
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
  const margin = { top: 80, right: 150, bottom: 80, left: 80 };
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
  // Color scale
  const colorScale = d3
    .scaleSequential()
    .domain([0, d3.max(processedData, (d) => d.glucoseSpike)])
    .interpolator(d3[options.interpolator]);

  // Scales
  const xScale = d3
    .scaleBand()
    .domain(processedData.map((d) => d.carbRange))
    .range([0, width])
    .padding(0.1);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(processedData, (d) => d.glucoseSpike) * 1.1])
    .range([height, 0]);

  // Add title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", 30)
    .text(options.title);

  // Add subtitle
  svg
    .append("text")
    .attr("class", "chart-subtitle")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", 55)
    .text(options.subtitle);

  // Add X axis
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  // Add Y axis
  g.append("g").call(d3.axisLeft(yScale));

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

  // Add bars
  g.selectAll(".bar")
    .data(processedData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => xScale(d.carbRange))
    .attr("width", xScale.bandwidth())
    .attr("y", (d) => yScale(d.glucoseSpike))
    .attr("height", (d) => height - yScale(d.glucoseSpike))
    .attr("fill", (d) => colorScale(d.glucoseSpike))
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>${
            d.carbRange
          }g carbs</strong><br/>Glucose spike: ${Math.round(
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
  const carbBins = [75, 50, 35, 20, 10, 0];
  const proteinBins = [40, 25, 15, 10, 3, 0];
  const carbLabels = ["75+", "50-75", "35-50", "20-35", "10-20", "0-10"];
  const proteinLabels = ["40+", "25-40", "15-25", "10-15", "3-10", "0-3"];

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
  createStabilizationChart(sortedProteinBins, "protein_stabilize_chart", proteinOptions);
  createStabilizationChart(sortedCarbBins, "carb_stabilize_chart", carbOptions);
}
await createPlot("viv_work/glucose_spikes.csv");

/* I really want to refactor the logic to allow the creation of both plots
1. Allow to take in an interpolator
2. 
*/
